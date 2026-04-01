import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCronSecretForInternalCall, isCronAuthorized } from "@/lib/cron-auth";

export const runtime = "nodejs";

// After firing, the alert transitions to 'triggered' status.
// It stays triggered until the user manually re-activates it ('active').
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

interface KalshiMarketSimple {
  ticker: string;
  title: string;
  yesMid: number;
}

// Fetch market by explicit ID — ensures lower-volume markets are evaluated correctly
async function fetchMarketById(baseUrl: string, marketId: string): Promise<GammaMarket | null> {
  try {
    const res = await fetch(`${baseUrl}/api/markets?id=${encodeURIComponent(marketId)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { markets?: GammaMarket[] } | GammaMarket[];
    if (Array.isArray(data)) return data[0] ?? null;
    if (Array.isArray(data.markets)) return data.markets[0] ?? null;
    return null;
  } catch {
    return null;
  }
}

// Fetch top markets by volume — used for keyword/name matching and "new market" alerts
async function fetchTopMarkets(baseUrl: string, limit = 200): Promise<GammaMarket[]> {
  try {
    const res = await fetch(
      `${baseUrl}/api/markets?limit=${limit}&active=true&order=volume24hr&ascending=false`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { markets?: GammaMarket[] };
    return Array.isArray(data.markets) ? data.markets : (data as unknown as GammaMarket[]);
  } catch {
    return [];
  }
}

// Fetch Kalshi markets for arbitrage detection
async function fetchKalshiMarkets(baseUrl: string): Promise<KalshiMarketSimple[]> {
  try {
    const res = await fetch(`${baseUrl}/api/kalshi?limit=200`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = (await res.json()) as { markets?: Array<{ ticker: string; marketTitle: string; eventTitle: string; yesMid: number }> };
    if (!Array.isArray(data.markets)) return [];
    return data.markets.map((m) => ({
      ticker: m.ticker,
      title: `${m.eventTitle} ${m.marketTitle}`.trim(),
      yesMid: m.yesMid,
    }));
  } catch {
    return [];
  }
}

// Returns true if the email was accepted by Resend, false on any error.
// The check engine only marks an alert 'triggered' when this returns true.
async function sendAlertEmail(
  baseUrl: string,
  cronSecret: string,
  to: string,
  alert: Alert,
  currentValue: string,
  changeText: string,
  resolvedMarketId: string | null
): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? baseUrl;
  const marketId = resolvedMarketId ?? alert.market_id;
  try {
    const res = await fetch(`${baseUrl}/api/alerts/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cronSecret}`,
        "x-cron-secret": cronSecret,
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

// Simple keyword-based matching for arbitrage: find Kalshi market matching alert's market_name keyword.
// Allows a match when either:
//   a) at least 2 keyword words appear in the title (multi-word overlap), OR
//   b) exactly 1 long keyword (>=5 chars) appears as a substring AND covers >=50% of meaningful words
function findKalshiMatch(kalshiMarkets: KalshiMarketSimple[], keyword: string): KalshiMarketSimple | null {
  const kw = keyword.toLowerCase();
  const words = kw.split(/\s+/).filter((w) => w.length > 3);
  if (words.length === 0) return null;
  let best: KalshiMarketSimple | null = null;
  let bestScore = 0;
  for (const m of kalshiMarkets) {
    const mLower = m.title.toLowerCase();
    const matchCount = words.filter((w) => mLower.includes(w)).length;
    if (matchCount > bestScore) {
      bestScore = matchCount;
      best = m;
    }
  }
  if (best === null) return null;
  // Allow strong single-word match: the one word must be long (>=5 chars) and be >=50% of query words
  const isSingleStrongMatch = bestScore === 1 && words.length === 1 && words[0].length >= 5;
  if (bestScore >= 2 || isSingleStrongMatch) return best;
  return null;
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cronSecret = getCronSecretForInternalCall(request);
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON secret not configured" }, { status: 503 });
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

  const hasArbitrageAlerts = alerts.some((a) => a.alert_type === "arbitrage");

  // Fetch top markets for name matching and "new market" alerts.
  // Also pre-fetch specific markets by ID for alerts that have market_id stored.
  // Fetch Kalshi markets only if there are arbitrage alerts.
  const [topMarkets, specificMarketResults, kalshiMarkets] = await Promise.all([
    fetchTopMarkets(origin),
    Promise.all(
      alerts
        .filter((a) => a.market_id)
        .map(async (a) => ({
          alertId: a.id,
          market: await fetchMarketById(origin, a.market_id!),
        }))
    ),
    hasArbitrageAlerts ? fetchKalshiMarkets(origin) : Promise.resolve([]),
  ]);

  // Build lookup maps
  const marketById = new Map<string, GammaMarket>();
  const marketByName = new Map<string, GammaMarket>();
  for (const m of topMarkets) {
    marketById.set(m.id, m);
    marketByName.set(m.question.toLowerCase(), m);
  }
  // Override with freshly fetched specific-market data (more accurate for off-top-100 markets)
  const specificByAlertId = new Map<string, GammaMarket>();
  for (const { alertId, market } of specificMarketResults) {
    if (market) {
      specificByAlertId.set(alertId, market);
      marketById.set(market.id, market);
    }
  }

  let triggered = 0;
  const cutoffMs = COOLDOWN_MINUTES * 60 * 1000;
  const now = Date.now();

  // Preload user email + email preference maps to avoid two DB calls per alert.
  const userIds = [...new Set(alerts.map((a) => a.user_id))];
  const [userResults, profileResult] = await Promise.all([
    Promise.allSettled(userIds.map((id) => supabase.auth.admin.getUserById(id))),
    supabase
      .from("profiles")
      .select("id,email_alerts_enabled")
      .in("id", userIds),
  ]);

  const emailByUserId = new Map<string, string>();
  userResults.forEach((r, i) => {
    if (r.status !== "fulfilled") return;
    const email = r.value.data.user?.email;
    if (email) {
      emailByUserId.set(userIds[i], email);
    }
  });

  const profileEmailEnabledByUserId = new Map<string, boolean>();
  if (!profileResult.error && Array.isArray(profileResult.data)) {
    for (const row of profileResult.data as Array<{ id: string; email_alerts_enabled: boolean | null }>) {
      profileEmailEnabledByUserId.set(row.id, row.email_alerts_enabled !== false);
    }
  }

  for (const alert of alerts) {
    // Secondary cooldown guard (60 min) to handle rapid re-arm edge cases
    if (alert.last_triggered_at) {
      const lastMs = new Date(alert.last_triggered_at).getTime();
      if (now - lastMs < cutoffMs) continue;
    }

    // Resolve market: prefer the directly-fetched specific market, then top-market lookup
    const market =
      specificByAlertId.get(alert.id) ??
      (alert.market_id ? marketById.get(alert.market_id) : null) ??
      (alert.market_name
        ? marketByName.get(alert.market_name.toLowerCase()) ??
          findFuzzyMarket(topMarkets, alert.market_name)
        : null);

    let shouldFire = false;
    let currentValue = "—";
    let changeText = "—";
    let resolvedMarketId: string | null = market?.id ?? null;
    let updatedSeenIds: string[] | null = null;
    let notificationMessage = "";

    if (alert.alert_type === "odds" && market) {
      let prices: number[] = [0.5, 0.5];
      try { prices = JSON.parse(market.outcomePrices || "[0.5,0.5]"); } catch { /* ok */ }
      const yesPrice = safeNum(prices[0]) * 100;
      currentValue = `${yesPrice.toFixed(1)}%`;
      if (yesPrice < alert.threshold) {
        shouldFire = true;
        changeText = `${yesPrice.toFixed(1)}% YES (below ${alert.threshold}% threshold)`;
        notificationMessage = `${market.question.slice(0, 80)}: YES odds dropped to ${yesPrice.toFixed(1)}% (threshold: ${alert.threshold}%)`;
      }
    } else if (alert.alert_type === "volume" && market) {
      const vol24h = safeNum(market.volume24hr ?? 0);
      currentValue = `$${(vol24h / 1000).toFixed(1)}k`;
      if (vol24h >= alert.threshold * 1000) {
        shouldFire = true;
        changeText = `$${(vol24h / 1000).toFixed(1)}k 24h volume (above $${alert.threshold}k threshold)`;
        notificationMessage = `${market.question.slice(0, 80)}: 24h volume reached $${(vol24h / 1000).toFixed(1)}k (threshold: $${alert.threshold}k)`;
      }
    } else if (alert.alert_type === "new") {
      // "New market" — only fires for markets NOT seen in previous check runs.
      // Tracks seen market IDs in the alert row to avoid re-triggering on the same market.
      const keyword = (alert.market_name ?? "").toLowerCase();
      const seen = new Set<string>(alert.seen_market_ids ?? []);
      if (keyword) {
        const matched = topMarkets.filter(
          (m) => m.question.toLowerCase().includes(keyword) && !seen.has(m.id)
        );
        if (matched.length > 0) {
          const newest = matched[0];
          shouldFire = true;
          resolvedMarketId = newest.id;
          currentValue = newest.question.slice(0, 70) + (newest.question.length > 70 ? "…" : "");
          changeText = `${matched.length} new matching market${matched.length > 1 ? "s" : ""} found`;
          notificationMessage = `New market matching "${alert.market_name}": ${newest.question.slice(0, 100)}`;
          // Record all currently visible matching markets as seen
          updatedSeenIds = [...seen, ...matched.map((m) => m.id)];
        }
      }
    } else if (alert.alert_type === "arbitrage") {
      // Arbitrage: compare YES price on Polymarket vs Kalshi for the same market keyword.
      // Fires when the spread (difference in YES price) exceeds the alert threshold (in %).
      const keyword = (alert.market_name ?? "").toLowerCase();
      if (keyword && market && kalshiMarkets.length > 0) {
        const kalshiMatch = findKalshiMatch(kalshiMarkets, keyword);
        if (kalshiMatch) {
          let prices: number[] = [0.5, 0.5];
          try { prices = JSON.parse(market.outcomePrices || "[0.5,0.5]"); } catch { /* ok */ }
          const polyYes = safeNum(prices[0]) * 100;
          const kalshiYes = kalshiMatch.yesMid * 100;
          const spread = Math.abs(polyYes - kalshiYes);
          if (spread >= alert.threshold) {
            shouldFire = true;
            const highPlatform = polyYes > kalshiYes ? "Polymarket" : "Kalshi";
            const lowPlatform = polyYes > kalshiYes ? "Kalshi" : "Polymarket";
            currentValue = `${spread.toFixed(1)}% spread`;
            changeText = `${highPlatform} YES: ${Math.max(polyYes, kalshiYes).toFixed(1)}% vs ${lowPlatform} YES: ${Math.min(polyYes, kalshiYes).toFixed(1)}%`;
            notificationMessage = `Arbitrage on "${alert.market_name}": ${spread.toFixed(1)}% spread — ${highPlatform} ${Math.max(polyYes, kalshiYes).toFixed(1)}% vs ${lowPlatform} ${Math.min(polyYes, kalshiYes).toFixed(1)}%`;
          }
        }
      }
    }

    if (!shouldFire) continue;

    const email = emailByUserId.get(alert.user_id);
    const profileEmailEnabled = profileEmailEnabledByUserId.get(alert.user_id) ?? true;

    // Only fire if email delivery succeeds (or email is disabled at alert or profile level).
    // On failure, the alert stays 'active' and retries on the next cron run.
    let emailOk = true;
    if (alert.delivery_email && email && profileEmailEnabled) {
      emailOk = await sendAlertEmail(
        origin,
        cronSecret,
        email,
        alert,
        currentValue,
        changeText,
        resolvedMarketId
      );
    }

    if (!emailOk) {
      console.warn(`[alerts/check] Email delivery failed for alert ${alert.id}; will retry`);
      continue;
    }

    triggered++;

    // Insert a notification record for in-app delivery.
    // If the insert fails, log and skip transitioning the alert so history is preserved
    // and the cron will retry on the next run.
    const finalMessage = notificationMessage || changeText;
    const { error: notifErr } = await supabase.from("notifications").insert({
      user_id: alert.user_id,
      alert_id: alert.id,
      alert_type: alert.alert_type,
      market_id: resolvedMarketId,
      market_name: alert.market_name,
      message: finalMessage,
      read: false,
    });
    if (notifErr) {
      console.error(`[alerts/check] Failed to insert notification for alert ${alert.id}:`, notifErr.message);
      // Don't mark alert as triggered — it will retry next cron run
      triggered--;
      continue;
    }

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
    marketsScanned: topMarkets.length,
    timestamp: new Date().toISOString(),
  });
}
