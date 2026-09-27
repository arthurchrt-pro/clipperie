export function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 font-display text-xl font-extrabold tracking-tight ${className}`}
    >
      <span aria-hidden className="voyant-rec size-3 rounded-full bg-rec" />
      Clipperie
    </span>
  );
}
