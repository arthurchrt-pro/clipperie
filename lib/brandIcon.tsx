// Pictogramme Clipperie : un clip vertical avec sa ligne de sous-titre, sur fond rouge REC.
export function BrandIcon({ size }: { size: number }) {
  const u = size / 32;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#d93a1f",
        borderRadius: 7 * u,
      }}
    >
      <div
        style={{
          width: 13 * u,
          height: 22 * u,
          borderRadius: 3 * u,
          background: "#f7f1e6",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          paddingBottom: 4 * u,
        }}
      >
        <div
          style={{
            width: 8 * u,
            height: 3 * u,
            borderRadius: 1 * u,
            background: "#1b1714",
          }}
        />
      </div>
    </div>
  );
}
