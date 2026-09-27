// Types partagés du moteur de découpe.

export type Word = { text: string; start: number; end: number };
export type Segment = { text: string; start: number; end: number };
export type Transcript = { language: string | null; words: Word[]; segments: Segment[] };

export type Layout = "plein_ecran" | "facecam_jeu";
export type Corner = "haut_gauche" | "haut_droite" | "bas_gauche" | "bas_droite";

// Position de la webcam en proportions de l'image (0 à 1).
export type Box = { x: number; y: number; w: number; h: number };

export type Moment = {
  start: number;
  end: number;
  title: string;
  score: number;
  reason: string;
};
