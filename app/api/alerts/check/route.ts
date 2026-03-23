import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// After firing, the alert transitions to 'triggered' status.
// It stays triggered until the user manually re-activates it ('active').
// This prevents repeat emails while the condition remains true.
// For volume/odds alerts the cooldown is a secondary guard in case of rapid re-arm.
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
  seen_market_ids: string[] | null;
}

interface GammaMarket {
  id: string;
  question: string;
  outcomePrices: string;
  volume: string;
  volume24hr?: number;
  createdAt?: string;
}

function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

async function fetchTopMarkets(baseUrl: string): Promise<GammaMarket[]> {
  try {
    const res = await fetch(
      `${baseUrl}/api/markets?limit=100&active=true&order=volume24hr&ascending=false`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { markets?: GammaMarket[] };
    return Array.isArray(data.markets) ? data.markets : (data as unknown as GammaMarket[]);
  } catch {
    return [];
  }
}

// Returns true if the email was accepted by Resend, false on any error.
// The check engine only marks an alert 'triggered' when this returns true.
async function sendAlertEmail(
  baseUrl: string,
  to: string,
  alert: Alert,
  currentValue: string,
  changeText: string,
  resolvedMarketId: string | null
): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET ?? "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? baseUrl;
  const marketId = resolvedMarketId ?? alert.market_id;
  try {
    const res = await fetch(`${baseUrl}/api/alerts/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cronSecret}`,
      },
      body: JSON.stringify({
        to,
        alertName: alert.name,
        alertType: alert.alert_type,
        marketName: alert.market_name ?? "Unknown Market",
        conditionText: alert.condition_text ?? `Threshold: ${alert.threshold}%`,
        currentValue,
        changeText,
        marketUrl: marketId ? `${appUrl}/markets/${marketId}` : `${appUrl}/markets`,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[alerts/check] Email send HTTP ${res.status}:`, body);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[alerts/check] Email send network error:", err);
    return false;
  }
}

function safeNum(v: unknown): number {
  const n = parseFloat(String(v));
  return isNaN(n) ? 0 : n;
}

function findFuzzyMarket(markets: GammaMarket[], name: string): GammaMarket | null {
  const words = name.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
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

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Supabase service role key not configured" }, { status: 503 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { origin } = new URL(request.url);

  // Only fetch 'active' alerts — 'triggered' alerts stay quiet until user re-arms them
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

  const markets = await fetchTopMarkets(origin);
  const marketById = new Map<string, GammaMarket>();
  const marketByName = new Map<string, GammaMarket>();
  for (const m of markets) {
    marketById.set(m.id, m);
    marketByName.set(m.question.toLowerCase(), m);
  }

  let triggered = 0;
  const cutoffMs = COOLDOWN_MINUTES * 60 * 1000;
  const now = Date.now();

  for (const alert of alerts) {
    // Secondary cooldown guard (60 min) to handle rapid re-arm edge cases
    if (alert.last_triggered_at) {
      const lastMs = new Date(alert.last_triggered_at).getTime();
      if (now - lastMs < cutoffMs) continue;
    }

    const market =
      (alert.market_id ? marketById.get(alert.market_id) : null) ??
      (alert.market_name
        ? marketByName.get(alert.market_name.toLowerCase()) ??
          findFuzzyMarket(markets, alert.market_name)
        : null);

    let shouldFire = false;
    let currentValue = "—";
    let changeText = "—";
    let resolvedMarketId: string | null = market?.id ?? null;
    let updatedSeenIds: string[] | null = null;

    if (alert.alert_type === "odds" && market) {
      let prices: number[] = [0.5, 0.5];
      try { prices = JSON.parse(market.outcomePrices || "[0.5,0.5]"); } catch { /* ok */ }
      const yesPrice = safeNum(prices[0]) * 100;
      currentValue = `${yesPrice.toFixed(1)}%`;
      if (yesPrice < alert.threshold) {
        shouldFire = true;
        changeText = `${yesPrice.toFixed(1)}% YES (below ${alert.threshold}% threshold)`;
      }
    } else if (alert.alert_type === "volume" && market) {
      const vol24h = safeNum(market.volume24hr ?? 0);
      currentValue = `$${(vol24h / 1000).toFixed(1)}k`;
      if (vol24h >= alert.threshold * 1000) {
        shouldFire = true;
        changeText = `$${(vol24h / 1000).toFixed(1)}k 24h volume (above $${alert.threshold}k threshold)`;
      }
    } else if (alert.alert_type === "new") {
      // "New market" — only fires for markets NOT seen in previous check runs.
      // Tracks seen market IDs in the alert row to avoid re-triggering on the same market.
      const keyword = (alert.market_name ?? "").toLowerCase();
      const seen = new Set<string>(alert.seen_market_ids ?? []);
      if (keyword) {
        const matched = markets.filter(
          (m) => m.question.toLowerCase().includes(keyword) && !seen.has(m.id)
        );
        if (matched.length > 0) {
          const newest = matched[0];
          shouldFire = true;
          resolvedMarketId = newest.id;
          currentValue = newest.question.slice(0, 70) + (newest.question.length > 70 ? "…" : "");
          changeText = `${matched.length} new matching market${matched.length > 1 ? "s" : ""} found`;
          // Record all currently visible matching markets as seen
          updatedSeenIds = [...seen, ...matched.map((m) => m.id)];
        }
      }
    }

    if (!shouldFire) continue;

    const { data: userData } = await supabase.auth.admin.getUserById(alert.user_id);
    const email = userData?.user?.email;

    // Only fire if email delivery succeeds (or email is disabled for this alert).
    // This prevents losing notifications due to transient Resend errors.
    let emailOk = true;
    if (alert.delivery_email && email) {
      emailOk = await sendAlertEmail(origin, email, alert, currentValue, changeText, resolvedMarketId);
    }

    if (!emailOk) {
      // Email delivery failed — leave alert in 'active' state so it retries on the next run.
      console.warn(`[alerts/check] Email delivery failed for alert ${alert.id}; will retry`);
      continue;
    }

    triggered++;

    // Transition to 'triggered' — stays quiet until user manually re-arms it.
    const updatePayload: Record<string, unknown> = {
      status: "triggered",
      last_triggered_at: new Date().toISOString(),
      trigger_count: alert.trigger_count + 1,
    };
    if (updatedSeenIds !== null) {
      updatePayload.seen_market_ids = updatedSeenIds;
    }

    await supabase.from("alerts").update(updatePayload).eq("id", alert.id);
  }

  return NextResponse.json({
    checked: alerts.length,
    triggered,
    marketsScanned: markets.length,
    timestamp: new Date().toISOString(),
  });
}
