// Envoi d'un gros fichier depuis le navigateur, en morceaux, directement vers le stockage.
// Plusieurs morceaux partent en même temps ; un morceau raté est renvoyé (5 essais).

import type { UploadPart } from "./upload";

export class UploadError extends Error {
  constructor(readonly reason: "reseau" | "stockage" | "annule") {
    super(reason);
  }
}

type Options = {
  file: Blob;
  partSize: number;
  // Demande au serveur des liens d'envoi signés pour ces morceaux.
  signParts: (partNumbers: number[]) => Promise<[number, string][]>;
  onProgress: (sentBytes: number) => void;
  signal: AbortSignal;
  concurrency?: number;
};

const SIGN_BATCH = 10;
const MAX_ATTEMPTS = 5;

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new UploadError("annule"));
      },
      { once: true },
    );
  });
}

function putPart(url: string, body: Blob, onLoaded: (bytes: number) => void, signal: AbortSignal) {
  return new Promise<string>((resolve, reject) => {
    if (signal.aborted) return reject(new UploadError("annule"));
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    signal.addEventListener("abort", abort, { once: true });
    const settle = () => signal.removeEventListener("abort", abort);

    xhr.open("PUT", url);
    xhr.upload.onprogress = (event) => onLoaded(event.loaded);
    xhr.onload = () => {
      settle();
      const etag = xhr.getResponseHeader("ETag");
      if (xhr.status >= 200 && xhr.status < 300 && etag) resolve(etag);
      // Réponse sans ETag lisible : la règle CORS du stockage ne l'expose pas.
      else reject(new UploadError(xhr.status >= 200 && xhr.status < 300 ? "stockage" : "reseau"));
    };
    xhr.onerror = () => {
      settle();
      reject(new UploadError("reseau"));
    };
    xhr.onabort = () => {
      settle();
      reject(new UploadError("annule"));
    };
    xhr.send(body);
  });
}

export async function uploadInParts({
  file,
  partSize,
  signParts,
  onProgress,
  signal,
  concurrency = 4,
}: Options): Promise<UploadPart[]> {
  const count = Math.max(1, Math.ceil(file.size / partSize));
  const sent = new Array<number>(count).fill(0);
  const report = () => onProgress(sent.reduce((total, bytes) => total + bytes, 0));

  // Au premier échec définitif, tous les envois en cours s'arrêtent.
  const stop = new AbortController();
  const onAbort = () => stop.abort();
  signal.addEventListener("abort", onAbort, { once: true });

  const urls = new Map<number, string>();
  let signing: Promise<void> | null = null;
  async function urlFor(partNumber: number, renew: boolean) {
    if (renew) urls.delete(partNumber);
    while (!urls.has(partNumber)) {
      if (!signing) {
        const batch: number[] = [];
        for (let n = partNumber; n <= count && batch.length < SIGN_BATCH; n++) {
          if (!urls.has(n)) batch.push(n);
        }
        signing = signParts(batch)
          .then((pairs) => pairs.forEach(([n, url]) => urls.set(n, url)))
          .finally(() => (signing = null));
      }
      await signing;
    }
    const url = urls.get(partNumber)!;
    urls.delete(partNumber); // un lien ne sert qu'une fois
    return url;
  }

  const parts: UploadPart[] = [];
  let next = 1;
  async function worker() {
    while (next <= count) {
      const partNumber = next++;
      const body = file.slice((partNumber - 1) * partSize, Math.min(file.size, partNumber * partSize));
      for (let attempt = 1; ; attempt++) {
        try {
          const url = await urlFor(partNumber, attempt > 1);
          const etag = await putPart(
            url,
            body,
            (bytes) => {
              sent[partNumber - 1] = bytes;
              report();
            },
            stop.signal,
          );
          sent[partNumber - 1] = body.size;
          report();
          parts.push({ number: partNumber, etag });
          break;
        } catch (error) {
          sent[partNumber - 1] = 0;
          report();
          const final =
            stop.signal.aborted ||
            attempt >= MAX_ATTEMPTS ||
            !(error instanceof UploadError) ||
            error.reason !== "reseau";
          if (final) throw error;
          await wait(1000 * 2 ** attempt, stop.signal);
        }
      }
    }
  }

  try {
    await Promise.all(
      Array.from({ length: Math.min(concurrency, count) }, () =>
        worker().catch((error) => {
          stop.abort();
          throw error;
        }),
      ),
    );
  } catch (error) {
    throw signal.aborted ? new UploadError("annule") : error;
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
  return parts.sort((a, b) => a.number - b.number);
}
