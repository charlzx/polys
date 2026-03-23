import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// Minimum minutes between emails for the same alert (dedup guard)
const COOLDOWN_MINUTES = 60;

interface Alert {
  id: string;
  user_id: string;
  name: string;
  alert_type: string;
  market_id: string | null;
  market_name: string | null;
  condition_text: string | null;
  threshold: number;
  delivery_email: boolean;
  status: string;
  last_triggered_at: string | null;
  trigger_count: number;
}

interface GammaMarket {
  id: string;
  question: string;
  outcomePrices: string;
  volume: string;
  volume24hr?: number;
}

function safeNum(v: unknown): number {
  const n = parseFloat(String(v));
  return isNaN(n) ? 0 : n;
}

// Fetch top markets from the internal proxy to avoid CORS issues server-side
async function fetchTopMarkets(baseUrl: string): Promise<GammaMarket[]> {
  try {
    const res = await fetch(
      `${baseUrl}/api/markets?limit=100&active=true&order=volume24hr&ascending=false`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { markets?: GammaMarket[] };
    return Array.isArray(data.markets) ? data.markets : (data as unknown as GammaMarket[]);
  } catch {
    return [];
  }
}

// Send email via the send route
async function sendAlertEmail(
  baseUrl: string,
  to: string,
  alert: Alert,
  currentValue: string,
  changeText: string
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? baseUrl;
  await fetch(`${baseUrl}/api/alerts/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to,
      alertName: alert.name,
      alertType: alert.alert_type,
      marketName: alert.market_name ?? "Unknown Market",
      conditionText: alert.condition_text ?? `Threshold: ${alert.threshold}%`,
      currentValue,
      changeText,
      marketUrl: alert.market_id ? `${appUrl}/markets/${alert.market_id}` : `${appUrl}/markets`,
    }),
  });
}

export async function GET(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Supabase service role key not configured" },
      { status: 503 }
    );
  }

  // Use service role key to bypass RLS for reading ALL active alerts
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { origin } = new URL(request.url);

  // 1. Load all active alerts
  const { data: alertsData, error: alertsErr } = await supabase
    .from("alerts")
    .select("*")
    .eq("status", "active");

  if (alertsErr) {
    return NextResponse.json({ error: alertsErr.message }, { status: 500 });
  }

  const alerts = (alertsData ?? []) as Alert[];
  if (alerts.length === 0) {
    return NextResponse.json({ checked: 0, triggered: 0 });
  }

  // 2. Fetch current market data
  const markets = await fetchTopMarkets(origin);

  // Build market lookup maps
  const marketByName = new Map<string, GammaMarket>();
  const marketById = new Map<string, GammaMarket>();
  for (const m of markets) {
    marketByName.set(m.question.toLowerCase(), m);
    marketById.set(m.id, m);
  }

  let triggered = 0;
  const cutoffMs = COOLDOWN_MINUTES * 60 * 1000;
  const now = Date.now();

  for (const alert of alerts) {
    // Cooldown guard — don't re-trigger within cooldown window
    if (alert.last_triggered_at) {
      const lastMs = new Date(alert.last_triggered_at).getTime();
      if (now - lastMs < cutoffMs) continue;
    }

    // Find the relevant market
    const market =
      (alert.market_id ? marketById.get(alert.market_id) : null) ??
      (alert.market_name
        ? marketByName.get(alert.market_name.toLowerCase()) ?? findFuzzyMarket(markets, alert.market_name)
        : null);

    let shouldFire = false;
    let currentValue = "—";
    let changeText = "—";

    if (alert.alert_type === "odds" && market) {
      // Parse YES price from outcomePrices JSON array
      const prices: number[] = JSON.parse(market.outcomePrices || "[0.5,0.5]");
      const yesPrice = safeNum(prices[0]) * 100;
      currentValue = `${yesPrice.toFixed(1)}%`;
      // For simplicity: fire if YES price is below threshold (e.g., "notify if YES < 40%")
      // In a full implementation, we'd store the comparison direction + previous value
      if (yesPrice < alert.threshold) {
        shouldFire = true;
        changeText = `${yesPrice.toFixed(1)}% (below ${alert.threshold}%)`;
      }
    } else if (alert.alert_type === "volume" && market) {
      const vol24h = safeNum(market.volume24hr ?? 0);
      currentValue = `$${(vol24h / 1000).toFixed(1)}k`;
      // Fire if 24h volume threshold in thousands exceeded
      if (vol24h >= alert.threshold * 1000) {
        shouldFire = true;
        changeText = `$${(vol24h / 1000).toFixed(1)}k 24h volume`;
      }
    } else if (alert.alert_type === "new" && markets.length > 0) {
      // "New market" alerts: if any market name contains the keyword (market_name as keyword)
      const keyword = (alert.market_name ?? "").toLowerCase();
      if (keyword) {
        const found = markets.find((m) => m.question.toLowerCase().includes(keyword));
        if (found) {
          shouldFire = true;
          currentValue = found.question.slice(0, 60) + "…";
          changeText = "New market found";
        }
      }
    }

    if (!shouldFire) continue;

    triggered++;

    // 3. Get user email
    const { data: userData } = await supabase.auth.admin.getUserById(alert.user_id);
    const email = userData?.user?.email;

    // 4. Send email if delivery_email is on and we have an address
    if (alert.delivery_email && email) {
      await sendAlertEmail(origin, email, alert, currentValue, changeText);
    }

    // 5. Update alert: increment trigger count, record timestamp
    await supabase
      .from("alerts")
      .update({
        last_triggered_at: new Date().toISOString(),
        trigger_count: alert.trigger_count + 1,
      })
      .eq("id", alert.id);
  }

  return NextResponse.json({
    checked: alerts.length,
    triggered,
    marketsScanned: markets.length,
    timestamp: new Date().toISOString(),
  });
}

function findFuzzyMarket(markets: GammaMarket[], name: string): GammaMarket | null {
  const lower = name.toLowerCase();
  const words = lower.split(/\s+/).filter((w) => w.length > 3);
  let best: GammaMarket | null = null;
  let bestScore = 0;
  for (const m of markets) {
    const mLower = m.question.toLowerCase();
    const score = words.filter((w) => mLower.includes(w)).length;
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return bestScore >= 2 ? best : null;
}
