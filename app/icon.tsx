import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: 32,
        height: 32,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        width="30"
        height="30"
        viewBox="0 0 24 24"
        fill="#5b5fec"
        stroke="none"
      >
        <polygon points="22,12 17,3.3 7,3.3 2,12 7,20.7 17,20.7" />
      </svg>
    </div>,
    { ...size }
  );
}
