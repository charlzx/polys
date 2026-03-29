import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Polys — Prediction Market Intelligence";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#09090b",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              background: "#3b82f6",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "32px",
              fontWeight: "700",
              color: "#fff",
            }}
          >
            P
          </div>
          <div
            style={{
              color: "#ffffff",
              fontSize: "56px",
              fontWeight: "700",
              letterSpacing: "-2px",
            }}
          >
            Polys
          </div>
        </div>

        <div
          style={{
            color: "#a1a1aa",
            fontSize: "28px",
            fontWeight: "400",
            textAlign: "center",
            maxWidth: "800px",
            lineHeight: "1.4",
            marginBottom: "40px",
          }}
        >
          Prediction Market Intelligence
        </div>

        <div
          style={{
            display: "flex",
            gap: "24px",
          }}
        >
          {["Real-time Odds", "Arbitrage Scanner", "AI Sentiment"].map((label) => (
            <div
              key={label}
              style={{
                background: "#18181b",
                border: "1px solid #27272a",
                borderRadius: "8px",
                padding: "10px 20px",
                color: "#71717a",
                fontSize: "18px",
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );
}
