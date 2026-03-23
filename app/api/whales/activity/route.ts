import { NextResponse } from "next/server";

const DATA_API = "https://data-api.polymarket.com";

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

const TRADE_SIZE_THRESHOLD = 1000; // $1k minimum for whale activity

export const runtime = "edge";

function safeNum(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return isNaN(n) ? 0 : n;
}

async function fetchWalletActivity(
  address: string
): Promise<Array<Record<string, unknown>>> {
  try {
    const res = await fetch(`${DATA_API}/activity?user=${address}&limit=50`);
    if (!res.ok) return [];
    const raw = await res.json();
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);

  // If a single address is given, return that wallet's activity
  if (address) {
    const items = await fetchWalletActivity(address);
    const activity = items
      .filter((a) => Math.abs(safeNum(a.usdcSize ?? a.amount)) >= TRADE_SIZE_THRESHOLD)
      .map((a) => ({
        id: String(a.id ?? `${Date.now()}-${Math.random()}`),
        proxyWallet: address,
        title: String(a.title ?? a.question ?? ""),
        side: String(a.side ?? "BUY"),
        outcome: String(a.outcome ?? "YES"),
        amount: Math.abs(safeNum(a.usdcSize ?? a.amount)),
        price: safeNum(a.price),
        timestamp: String(a.timestamp ?? new Date().toISOString()),
      }));
    return NextResponse.json({ activity, source: "user" });
  }

  // Default: aggregate large trades from all tracked wallets
  const allActivity = await Promise.allSettled(
    TRACKED_WALLETS.map(async (addr) => {
      const items = await fetchWalletActivity(addr);
      return items
        .filter((a) => Math.abs(safeNum(a.usdcSize ?? a.amount)) >= TRADE_SIZE_THRESHOLD)
        .map((a) => ({
          id: String(a.id ?? `${addr}-${Date.now()}-${Math.random()}`),
          proxyWallet: addr,
          title: String(a.title ?? a.question ?? ""),
          side: String(a.side ?? "BUY"),
          outcome: String(a.outcome ?? "YES"),
          amount: Math.abs(safeNum(a.usdcSize ?? a.amount)),
          price: safeNum(a.price),
          timestamp: String(a.timestamp ?? new Date().toISOString()),
        }));
    })
  );

  type ActivityItem = {
    id: string; proxyWallet: string; title: string; side: string;
    outcome: string; amount: number; price: number; timestamp: string;
  };
  const flatActivity: ActivityItem[] = allActivity
    .filter((r) => r.status === "fulfilled")
    .flatMap((r) => (r as PromiseFulfilledResult<ActivityItem[]>).value)
    .sort(
      (a, b) =>
        new Date(String(b.timestamp ?? 0)).getTime() -
        new Date(String(a.timestamp ?? 0)).getTime()
    )
    .slice(0, limit);

  return NextResponse.json({ activity: flatActivity, source: "wallets" });
}
