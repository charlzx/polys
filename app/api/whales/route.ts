import { NextResponse } from "next/server";

const DATA_API = "https://data-api.polymarket.com";

// Seed list of known Polymarket proxy wallet addresses for the leaderboard.
// The feature gracefully handles addresses with no on-chain data.
const TRACKED_WALLETS = [
  "0x8BD6C3D7a57D650A1870dd338234f90051fe9918",
  "0x3d3dB3BeE80414717e3C66c341EF95eCc9BDDBaB",
  "0x01a4333b6aCb5091cF0219646f35E289546F4656",
  "0x13064324dFF1e76062975345d255EFccc6C78bd0",
  "0x4d96190E8D0487d019987Cd9dF34dD51f617037F",
  "0xe7C33D231C3cc668457dE4F15AD398E2B8ECa8D7",
  "0x365E12B47919b0E3BCF1c8CC3Ecd8FB88b80560F",
  "0xD4D7c117645A85bCbe39Bfe9d8847628F75734b0",
  "0xEb70cbb241d2947aa2c145B9F8F9dd97309e54B7",
  "0x5a91461432cC131871beBb7adacE6523b95fEB51",
];

export const runtime = "edge";

function safeNum(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return isNaN(n) ? 0 : n;
}

async function fetchWalletData(address: string) {
  const [posRes, actRes, valRes] = await Promise.allSettled([
    fetch(`${DATA_API}/positions?user=${address}&sizeThreshold=0&limit=50`),
    fetch(`${DATA_API}/activity?user=${address}&limit=50`),
    fetch(`${DATA_API}/value?user=${address}`),
  ]);

  let positions: object[] = [];
  let activity: object[] = [];
  let portfolioValue = 0;

  if (posRes.status === "fulfilled" && posRes.value.ok) {
    const raw = await posRes.value.json();
    positions = Array.isArray(raw) ? raw : [];
  }
  if (actRes.status === "fulfilled" && actRes.value.ok) {
    const raw = await actRes.value.json();
    activity = Array.isArray(raw) ? raw : [];
  }
  if (valRes.status === "fulfilled" && valRes.value.ok) {
    const raw = await valRes.value.json();
    const arr = Array.isArray(raw) ? raw : [];
    portfolioValue = safeNum(arr[0]?.value);
  }

  // Derive metrics from real data
  const typedAct = activity as Array<Record<string, unknown>>;
  const typedPos = positions as Array<Record<string, unknown>>;

  const totalVolume = typedAct.reduce((s, a) => s + Math.abs(safeNum(a.usdcSize ?? a.amount)), 0);
  const openPositions = typedPos.filter((p) => safeNum(p.size) > 0).length;
  const resolved = typedPos.filter((p) => safeNum(p.cashPnl) !== 0);
  const wins = resolved.filter((p) => safeNum(p.cashPnl) > 0).length;
  const winRate = resolved.length > 0 ? Math.round((wins / resolved.length) * 100) : 0;

  const recentTrades = typedAct.slice(0, 3).map((a) => ({
    title: String(a.title ?? a.question ?? ""),
    side: String(a.side ?? "BUY"),
    outcome: String(a.outcome ?? "YES"),
    amount: Math.abs(safeNum(a.usdcSize ?? a.amount)),
    timestamp: String(a.timestamp ?? ""),
  }));

  const lastActive =
    typedAct.length > 0
      ? String(
          typedAct.sort(
            (a, b) =>
              new Date(String(b.timestamp ?? 0)).getTime() -
              new Date(String(a.timestamp ?? 0)).getTime()
          )[0]?.timestamp ?? ""
        )
      : null;

  return {
    address,
    portfolioValue,
    totalVolume,
    winRate,
    openPositions,
    recentTrades: typedAct.length,
    recentTradesList: recentTrades,
    lastActive,
    hasData: portfolioValue > 0 || typedAct.length > 0 || typedPos.length > 0,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "10"), 20);

  try {
    // Fetch data for each tracked wallet in parallel
    const results = await Promise.allSettled(
      TRACKED_WALLETS.slice(0, limit).map(fetchWalletData)
    );

    const whales = results
      .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof fetchWalletData>>> =>
        r.status === "fulfilled"
      )
      .map((r) => r.value)
      .sort((a, b) => {
        // Wallets with data rank first; within data-wallets, sort by portfolio value
        if (a.hasData && !b.hasData) return -1;
        if (!a.hasData && b.hasData) return 1;
        return b.portfolioValue - a.portfolioValue;
      });

    return NextResponse.json({ whales });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
