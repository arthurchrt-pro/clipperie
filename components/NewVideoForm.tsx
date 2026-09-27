"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { abortUpload, completeUpload, signUploadParts, startUpload, submitVideo } from "@/app/app/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { buttonPrimary, buttonSecondary } from "@/lib/ui";
import { fileExtension, formatBytes, MAX_UPLOAD_BYTES, MIN_UPLOAD_BYTES, UPLOAD_ACCEPT } from "@/lib/upload";
import { UploadError, uploadInParts } from "@/lib/uploadClient";

type Mode = "lien" | "fichier";
type Phase = "choix" | "envoi" | "finalisation";

const CORNERS = [
  ["haut_gauche", "En haut à gauche"],
  ["haut_droite", "En haut à droite"],
  ["bas_gauche", "En bas à gauche"],
  ["bas_droite", "En bas à droite"],
] as const;

function fileProblem(file: File) {
  if (!fileExtension(file.name)) return "Ce format n’est pas accepté. Dépose une vidéo MP4, MOV, MKV ou WEBM.";
  if (file.size > MAX_UPLOAD_BYTES) return `Ce fichier dépasse ${formatBytes(MAX_UPLOAD_BYTES)}.`;
  if (file.size < MIN_UPLOAD_BYTES) return "Ce fichier est trop petit pour être une vidéo.";
  return null;
}

function remainingLabel(seconds: number) {
  if (seconds < 60) return "moins d’une minute restante";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `environ ${minutes} min restantes`;
  const hours = Math.floor(minutes / 60);
  return `environ ${hours} h ${String(minutes % 60).padStart(2, "0")} restantes`;
}

export function NewVideoForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("lien");
  const [layout, setLayout] = useState("plein_ecran");
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("choix");
  const [sent, setSent] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const startedAt = useRef(0);

  const uploading = phase !== "choix";

  // Fermer la page couperait l'envoi : le navigateur demande confirmation.
  useEffect(() => {
    if (!uploading) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [uploading]);

  function pickFile(picked: File | null | undefined) {
    if (!picked) return;
    setFile(picked);
    setError(fileProblem(picked));
  }

  function onProgress(bytes: number) {
    setSent(bytes);
    const elapsed = (Date.now() - startedAt.current) / 1000;
    if (file && elapsed > 5 && bytes > 0) setRemaining(((file.size - bytes) * elapsed) / bytes);
  }

  async function onFileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploading) return;
    if (!file) return setError("Choisis d’abord un fichier vidéo.");
    const problem = fileProblem(file);
    if (problem) return setError(problem);

    const form = new FormData(event.currentTarget);
    const controller = new AbortController();
    abortRef.current = controller;
    setError(null);
    setSent(0);
    setRemaining(null);
    setPhase("envoi");
    startedAt.current = Date.now();

    let started: { key: string; uploadId: string } | null = null;
    try {
      const start = await startUpload({ name: file.name, size: file.size, type: file.type });
      if (!start.ok) throw new Error(start.error);
      started = { key: start.key, uploadId: start.uploadId };

      const parts = await uploadInParts({
        file,
        partSize: start.partSize,
        signal: controller.signal,
        onProgress,
        signParts: async (partNumbers) => {
          const signed = await signUploadParts({ ...started!, partNumbers });
          if (!signed.ok) throw new Error(signed.error);
          return signed.urls;
        },
      });

      setPhase("finalisation");
      const done = await completeUpload({
        ...started,
        parts,
        name: file.name,
        layout: form.get("layout"),
        corner: form.get("corner"),
      });
      if (!done.ok) {
        started = null; // le serveur a déjà fait le ménage
        throw new Error(done.error);
      }
      setFile(null);
      setPhase("choix");
      router.replace("/app?ajoute=1");
    } catch (failure) {
      if (started) void abortUpload(started);
      setPhase("choix");
      if (failure instanceof UploadError) {
        setError(
          failure.reason === "annule"
            ? null
            : failure.reason === "stockage"
              ? "Le dépôt de fichiers n’est pas encore ouvert. Colle plutôt un lien pour l’instant."
              : "L’envoi n’a pas abouti. Vérifie ta connexion, puis réessaie.",
        );
      } else {
        setError(failure instanceof Error && failure.message ? failure.message : "L’envoi n’a pas abouti. Réessaie.");
      }
    }
  }

  const percent = file ? Math.min(100, Math.floor((sent / file.size) * 100)) : 0;

  return (
    <form
      action={mode === "lien" ? submitVideo : undefined}
      onSubmit={mode === "fichier" ? onFileSubmit : undefined}
      className="mt-6 flex flex-col gap-5"
    >
      <fieldset disabled={uploading}>
        <legend className="sr-only">D’où vient la vidéo&nbsp;?</legend>
        <div className="grid grid-cols-2 gap-1 rounded-2xl border-2 border-encre bg-creme p-1">
          {(
            [
              ["lien", "Coller un lien"],
              ["fichier", "Déposer un fichier"],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className="flex min-h-12 cursor-pointer items-center justify-center rounded-xl px-2 text-center text-sm font-bold has-[:checked]:bg-encre has-[:checked]:text-creme has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-rec md:text-base"
            >
              <input
                type="radio"
                name="source"
                value={value}
                checked={mode === value}
                onChange={() => {
                  setMode(value);
                  setError(null);
                }}
                className="sr-only"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      {mode === "lien" ? (
        <label className="flex flex-col gap-2 font-semibold">
          Lien du live
          <input
            type="text"
            name="url"
            required
            inputMode="url"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="twitch.tv/videos/… ou youtube.com/watch?v=…"
            className="min-h-14 rounded-2xl border-2 border-encre bg-creme px-4 text-base font-normal placeholder:text-encre-douce/60"
          />
        </label>
      ) : (
        <div className="flex flex-col gap-2">
          <span className="font-semibold">Fichier vidéo</span>
          <label
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              if (!uploading) pickFile(event.dataTransfer.files[0]);
            }}
            className={`flex min-h-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed px-4 py-5 text-center has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-rec ${
              dragging ? "border-rec bg-surligneur/40" : "border-encre bg-creme"
            } ${uploading ? "cursor-default opacity-80" : ""}`}
          >
            <input
              type="file"
              accept={UPLOAD_ACCEPT}
              disabled={uploading}
              onChange={(event) => pickFile(event.target.files?.[0])}
              className="sr-only"
            />
            {file ? (
              <>
                <span className="max-w-full truncate font-semibold">{file.name}</span>
                <span className="text-sm text-encre-douce">
                  {formatBytes(file.size)}
                  {!uploading && " · toucher pour changer"}
                </span>
              </>
            ) : (
              <>
                <span className="font-display font-extrabold">Choisis ta vidéo</span>
                <span className="text-sm text-encre-douce">
                  MP4, MOV, MKV ou WEBM, jusqu’à {formatBytes(MAX_UPLOAD_BYTES)}
                </span>
              </>
            )}
          </label>
        </div>
      )}

      <fieldset disabled={uploading}>
        <legend className="font-semibold">Cadrage des clips</legend>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <LayoutChoice
            value="plein_ecran"
            title="Plein écran"
            text="La caméra filme le streamer (Just Chatting, podcast)."
            checked={layout === "plein_ecran"}
            onChange={setLayout}
          />
          <LayoutChoice
            value="facecam_jeu"
            title="Facecam + jeu"
            text="Webcam en haut, jeu en bas (streams gaming)."
            checked={layout === "facecam_jeu"}
            onChange={setLayout}
          />
        </div>
      </fieldset>

      <fieldset disabled={uploading} hidden={layout !== "facecam_jeu"}>
        <legend className="font-semibold">Où est la webcam sur le live&nbsp;?</legend>
        <div className="mt-2 grid grid-cols-2 gap-3">
          {CORNERS.map(([value, label], i) => (
            <label
              key={value}
              className="flex min-h-12 cursor-pointer items-center gap-2 rounded-2xl border-2 border-encre/25 bg-creme px-3 text-sm font-semibold has-[:checked]:border-encre has-[:checked]:bg-surligneur/40"
            >
              <input
                type="radio"
                name="corner"
                value={value}
                defaultChecked={i === 0}
                className="size-4 shrink-0 accent-[var(--color-rec)]"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="rounded-2xl border-2 border-rec bg-papier px-4 py-3 leading-snug">
          {error}
        </p>
      )}

      {mode === "lien" ? (
        <SubmitButton pendingLabel="Ajout du live…">Lancer la découpe</SubmitButton>
      ) : uploading ? (
        <div className="flex flex-col gap-3" aria-live="polite">
          <div className="flex justify-between text-sm font-semibold tabular-nums">
            <span>{phase === "finalisation" ? "Dernières vérifications…" : `Envoi du fichier · ${percent} %`}</span>
            {file && (
              <span className="text-encre-douce">
                {formatBytes(sent)} / {formatBytes(file.size)}
              </span>
            )}
          </div>
          <div
            className="h-3 overflow-hidden rounded-full bg-sable"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-label="Envoi du fichier"
          >
            <div className="h-full rounded-full bg-rec transition-[width]" style={{ width: `${percent}%` }} />
          </div>
          <p className="text-sm leading-snug text-encre-douce">
            {remaining !== null && phase === "envoi" ? `${remainingLabel(remaining)}. ` : ""}
            Garde cette page ouverte jusqu’à la fin de l’envoi.
          </p>
          {phase === "envoi" && (
            <button type="button" onClick={() => abortRef.current?.abort()} className={buttonSecondary}>
              Annuler l’envoi
            </button>
          )}
        </div>
      ) : (
        <button type="submit" className={buttonPrimary}>
          Envoyer et lancer la découpe
        </button>
      )}
    </form>
  );
}

function LayoutChoice({
  value,
  title,
  text,
  checked,
  onChange,
}: {
  value: string;
  title: string;
  text: string;
  checked: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex cursor-pointer gap-3 rounded-2xl border-2 border-encre/25 bg-creme p-4 has-[:checked]:border-encre has-[:checked]:bg-surligneur/40">
      <input
        type="radio"
        name="layout"
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="mt-1 size-5 shrink-0 accent-[var(--color-rec)]"
      />
      <span>
        <span className="block font-display font-extrabold">{title}</span>
        <span className="mt-1 block text-sm leading-snug text-encre-douce">{text}</span>
      </span>
    </label>
  );
}
