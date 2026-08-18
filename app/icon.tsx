import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#092340",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#ffc72c",
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: -0.5,
        }}
      >
        S
      </div>
    ),
    { ...size }
  );
}
