import { ImageResponse } from "next/og";

export const alt = "How much could your family save on skiing this winter?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#ffffff",
          padding: "72px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 24,
            fontWeight: 700,
            color: "#092340",
            letterSpacing: 1,
          }}
        >
          <div
            style={{
              width: 18,
              height: 18,
              background: "#ffc72c",
            }}
          />
          Ski Family Savings
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div
            style={{
              fontSize: 62,
              fontWeight: 700,
              color: "#092340",
              lineHeight: 0.95,
              letterSpacing: -1.6,
              maxWidth: 1000,
            }}
          >
            How much could your family save on skiing this winter?
          </div>
          <div
            style={{
              fontSize: 26,
              color: "#575757",
              maxWidth: 820,
              lineHeight: 1.4,
            }}
          >
            Get a free personalized Ski Family Savings Scan and find out how
            much potential savings may be available to your family.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#ffc72c",
            color: "#092340",
            padding: "18px 32px",
            borderRadius: 4,
            fontSize: 22,
            fontWeight: 700,
            width: 300,
          }}
        >
          Get My Free Scan
        </div>
      </div>
    ),
    { ...size }
  );
}
