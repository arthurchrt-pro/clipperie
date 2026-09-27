import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { SITE } from "@/lib/site";

export const alt = SITE.promise;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const display = await readFile(
  join(process.cwd(), "assets/fonts/BricolageGrotesque-ExtraBold.ttf"),
);
const text = await readFile(
  join(process.cwd(), "assets/fonts/InstrumentSans-Medium.ttf"),
);

const CLIPS = [
  { before: "j’ai", word: "démissionné", after: "un mardi", tilt: -4 },
  { before: "personne ne", word: "regarde", after: "ton intro", tilt: 0 },
  { before: "c’est là que", word: "tout", after: "se joue", tilt: 4 },
];

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#f7f1e6",
          color: "#1b1714",
          padding: "64px 64px 56px",
          fontFamily: "Instrument Sans",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", width: 640 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              fontFamily: "Bricolage Grotesque",
              fontSize: 40,
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                background: "#d93a1f",
              }}
            />
            Clipperie
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: 48,
              fontFamily: "Bricolage Grotesque",
              fontSize: 64,
              lineHeight: 1.05,
              letterSpacing: -1.5,
            }}
          >
            <div style={{ display: "flex" }}>Un live de deux heures</div>
            <div style={{ display: "flex", gap: 16 }}>
              devient
              <div
                style={{
                  display: "flex",
                  background: "#ffd23f",
                  padding: "0 10px",
                  borderRadius: 8,
                }}
              >
                trente clips
              </div>
            </div>
            <div style={{ display: "flex" }}>verticaux.</div>
          </div>
          <div
            style={{
              display: "flex",
              marginTop: "auto",
              fontSize: 28,
              color: "#5a524b",
            }}
          >
            Un lien Twitch ou YouTube, des clips TikTok prêts à publier.
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 14,
          }}
        >
          {CLIPS.map((clip) => (
            <div
              key={clip.word}
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                alignItems: "center",
                width: 136,
                height: 242,
                borderRadius: 18,
                border: "3px solid #1b1714",
                background: "#2a2420",
                boxShadow: "5px 5px 0 #1b1714",
                transform: `rotate(${clip.tilt}deg) translateY(${clip.tilt === 0 ? -12 : 8}px)`,
                padding: "0 8px 44px",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 74,
                  left: 45,
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  background: "#3d352f",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 20,
                  width: 90,
                  height: 90,
                  borderRadius: "45px 45px 0 0",
                  background: "#3d352f",
                }}
              />
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  gap: 4,
                  fontFamily: "Bricolage Grotesque",
                  fontSize: 15,
                  lineHeight: 1.2,
                  color: "#ffffff",
                  textTransform: "uppercase",
                  textAlign: "center",
                }}
              >
                <span>{clip.before}</span>
                <span
                  style={{
                    background: "#ffd23f",
                    color: "#1b1714",
                    padding: "0 4px",
                    borderRadius: 3,
                  }}
                >
                  {clip.word}
                </span>
                <span>{clip.after}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Bricolage Grotesque", data: display, weight: 800, style: "normal" },
        { name: "Instrument Sans", data: text, weight: 500, style: "normal" },
      ],
    },
  );
}
