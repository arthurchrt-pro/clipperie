// Page provisoire de l'étape 0 : elle sert uniquement à vérifier la mise en ligne.
// La vraie landing arrive à l'étape 1, une fois la direction design validée.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-3xl font-bold">Clipperie</h1>
      <p className="max-w-sm text-lg">
        Un live de deux heures devient trente clips verticaux.
      </p>
      <p className="text-sm opacity-60">Bientôt en ligne.</p>
    </main>
  );
}
