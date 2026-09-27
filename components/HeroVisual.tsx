// Illustration du haut de page : une vidéo de 2 h, ses 30 moments repérés,
// et trois d'entre eux devenus des clips verticaux sous-titrés. Pur HTML/CSS, aucune image à charger.

const DURATION_MIN = 120;

// Minutes des 30 moments repérés dans l'exemple.
const MOMENTS = [
  3, 7, 12.7, 16, 21, 25, 29, 33, 38, 42, 47.1, 51, 55, 58, 62, 66, 70, 74, 78,
  81, 85, 88, 91.4, 95, 99, 103, 107, 110, 114, 117,
];

const CLIPS = [
  {
    minute: 12.7,
    time: "00:12:41",
    before: "j’ai",
    word: "démissionné",
    after: "un mardi",
    title: "Le jour où j’ai tout arrêté",
  },
  {
    minute: 47.1,
    time: "00:47:05",
    before: "personne ne",
    word: "regarde",
    after: "ton intro",
    title: "L’erreur de tous les débutants",
  },
  {
    minute: 91.4,
    time: "01:31:22",
    before: "c’est là que",
    word: "tout",
    after: "se joue",
    title: "Pourquoi le format court change tout",
  },
];

const BAR_COUNT = 64;
const BARS = Array.from({ length: BAR_COUNT }, (_, i) => {
  const height =
    22 + Math.round(70 * Math.abs(Math.sin(i * 0.7) * Math.cos(i * 0.23)));
  const minute = ((i + 0.5) / BAR_COUNT) * DURATION_MIN;
  const selected = CLIPS.some((clip) => Math.abs(clip.minute - minute) < 2.2);
  return { height, selected };
});

const TILTS = ["-rotate-3 translate-y-2", "", "rotate-3 translate-y-2"];

export function HeroVisual() {
  return (
    <figure className="relative">
      <figcaption className="sr-only">
        Exemple&nbsp;: à partir du lien d’un live Twitch de deux heures,
        Clipperie repère trente moments et les transforme en clips verticaux
        sous-titrés, chacun avec un titre.
      </figcaption>

      <div aria-hidden>
        {/* La vidéo longue : forme d'onde et moments repérés */}
        <div className="rounded-2xl border-2 border-encre bg-papier p-3 shadow-[4px_4px_0_var(--color-encre)]">
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-encre/15 bg-creme px-2.5 py-1.5 text-xs font-semibold text-encre-douce md:text-sm">
            <svg
              viewBox="0 0 24 24"
              className="size-4 shrink-0 text-rec"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
              <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
            </svg>
            <span className="truncate">twitch.tv/videos/2219438871</span>
            <span className="ml-auto shrink-0 rounded bg-encre px-1.5 py-0.5 text-[10px] text-creme md:text-xs">
              Lien collé
            </span>
          </div>
          <div className="relative h-3">
            {MOMENTS.map((minute) => {
              const isClip = CLIPS.some((clip) => clip.minute === minute);
              return (
                <span
                  key={minute}
                  className={`absolute bottom-0 w-[2px] rounded-full bg-rec ${
                    isClip ? "h-3" : "h-1.5 opacity-40"
                  }`}
                  style={{ left: `${(minute / DURATION_MIN) * 100}%` }}
                />
              );
            })}
          </div>
          <div className="mt-1 flex h-12 items-center gap-[2px]">
            {BARS.map((bar, i) => (
              <span
                key={i}
                className={`flex-1 rounded-full ${
                  bar.selected ? "bg-rec" : "bg-encre/20"
                }`}
                style={{ height: `${bar.height}%` }}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-xs font-semibold text-encre-douce tabular-nums">
            <span>0:00:00</span>
            <span className="text-rec">30 moments repérés</span>
            <span>2:00:00</span>
          </div>
        </div>

        {/* Les clips verticaux */}
        <div className="mt-6 grid grid-cols-3 gap-3 md:gap-4">
          {CLIPS.map((clip, i) => (
            <div key={clip.time} className={TILTS[i]}>
              <div className="relative aspect-[9/16] overflow-hidden rounded-2xl border-2 border-encre bg-ecran shadow-[3px_3px_0_var(--color-encre)]">
                <svg
                  viewBox="0 0 90 160"
                  className="absolute inset-0 h-full w-full"
                  preserveAspectRatio="xMidYMax slice"
                >
                  <circle cx="45" cy="64" r="17" fill="var(--color-silhouette)" />
                  <path
                    d="M12 160 C12 108 78 108 78 160 Z"
                    fill="var(--color-silhouette)"
                  />
                </svg>
                <span className="absolute top-2 left-2 rounded-md bg-encre/70 px-1.5 py-0.5 text-[9px] font-semibold text-creme tabular-nums md:text-[11px]">
                  {clip.time}
                </span>
                <p className="absolute inset-x-1.5 bottom-[18%] text-center font-display text-[10px] leading-[1.3] font-extrabold tracking-wide text-white uppercase [word-spacing:0.12em] md:text-[13px]">
                  {clip.before}{" "}
                  <span className="surligne">{clip.word}</span> {clip.after}
                </p>
              </div>
              <p className="mt-2.5 text-[13px] leading-tight font-semibold [word-spacing:0.05em] md:text-sm">
                {clip.title}
              </p>
            </div>
          ))}
        </div>
      </div>
    </figure>
  );
}
