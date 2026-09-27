import { logger, task } from "@trigger.dev/sdk";
import { processVideo as runPipeline } from "../engine/pipeline";

// Tâche longue exécutée par Trigger.dev : un live devient une série de clips.
export const processVideo = task({
  id: "process-video",
  machine: "medium-2x",
  maxDuration: 4 * 60 * 60,
  retry: { maxAttempts: 1 },
  run: async (payload: { videoId: string }) => {
    await runPipeline(payload.videoId, (message, data) => logger.info(message, data));
    return { videoId: payload.videoId };
  },
});
