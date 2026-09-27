import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clipperie — Un live de deux heures devient trente clips verticaux",
  description:
    "Dépose ta vidéo longue, récupère des clips verticaux sous-titrés, prêts à publier sur TikTok, Reels et Shorts.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
