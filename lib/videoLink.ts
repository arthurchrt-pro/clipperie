// Reconnaît un lien de rediffusion Twitch ou de vidéo YouTube et le met au propre.
export type VideoLink = { type: "twitch" | "youtube"; url: string };

export function parseVideoLink(input: string): VideoLink | null {
  const raw = input.trim();
  if (!raw) return null;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^(www\.|m\.)/, "");

  if (host === "twitch.tv") {
    const id =
      url.pathname.match(/^\/videos\/(\d+)/)?.[1] ??
      url.pathname.match(/^\/[\w-]+\/v\/(\d+)/)?.[1];
    return id ? { type: "twitch", url: `https://www.twitch.tv/videos/${id}` } : null;
  }

  if (host === "youtube.com" || host === "youtu.be") {
    const id =
      host === "youtu.be"
        ? url.pathname.slice(1)
        : (url.searchParams.get("v") ??
          url.pathname.match(/^\/(?:live|shorts|embed)\/([\w-]{11})/)?.[1]);
    if (id && /^[\w-]{11}$/.test(id)) {
      return { type: "youtube", url: `https://www.youtube.com/watch?v=${id}` };
    }
  }

  return null;
}
