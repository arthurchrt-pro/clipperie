import { logger, schedules } from "@trigger.dev/sdk";
import { deleteFiles, isStorageConfigured, listFilesOlderThan } from "../engine/storage";
import { LEGAL } from "../lib/site";

// Chaque nuit : efface les vidéos déposées par les clients depuis plus de 7 jours
// (engagement pris dans les CGV). Les clips, eux, restent.
export const cleanupSources = schedules.task({
  id: "cleanup-sources",
  cron: { pattern: "17 3 * * *", timezone: "Europe/Paris", environments: ["PRODUCTION"] },
  run: async () => {
    if (!isStorageConfigured()) return { deleted: 0 };
    const before = new Date(Date.now() - LEGAL.sourceRetentionDays * 24 * 3600 * 1000);
    const keys = await listFilesOlderThan("sources/", before);
    await deleteFiles(keys);
    logger.info("Vidéos déposées effacées", { fichiers: keys.length });
    return { deleted: keys.length };
  },
});
