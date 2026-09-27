// Champ légal pas encore renseigné : affiché bien visible pour ne pas l'oublier.
export function Todo({ value, label }: { value: string | null; label: string }) {
  if (value) return <>{value}</>;
  return (
    <mark className="surligne font-semibold">[À COMPLÉTER&nbsp;: {label}]</mark>
  );
}
