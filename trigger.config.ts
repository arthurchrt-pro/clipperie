import { additionalFiles, ffmpeg } from "@trigger.dev/build/extensions/core";
import type { BuildExtension } from "@trigger.dev/build/extensions";
import { defineConfig } from "@trigger.dev/sdk";

// Installe yt-dlp (récupération des lives Twitch et des vidéos YouTube) dans l'image du moteur.
function ytDlp(): BuildExtension {
  return {
    name: "yt-dlp",
    onBuildComplete(context) {
      if (context.target === "dev") return;
      context.addLayer({
        id: "yt-dlp",
        image: {
          instructions: [
            "RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && rm -rf /var/lib/apt/lists/* && " +
              "curl -fsSL https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux -o /usr/local/bin/yt-dlp && " +
              "chmod a+rx /usr/local/bin/yt-dlp",
          ],
        },
        deploy: { env: { YTDLP_PATH: "/usr/local/bin/yt-dlp" }, override: true },
      });
    },
  };
}

export default defineConfig({
  project: "proj_cgukcobgngzsncpovobt",
  dirs: ["./trigger"],
  runtime: "node-22",
  logLevel: "info",
  maxDuration: 4 * 60 * 60,
  retries: {
    enabledInDev: false,
    default: { maxAttempts: 1 },
  },
  build: {
    extensions: [
      ffmpeg({ version: "7" }),
      ytDlp(),
      additionalFiles({ files: ["./assets/fonts/*.ttf"] }),
    ],
  },
});
