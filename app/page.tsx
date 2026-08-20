export default function Home() {
  return (
    <main
      style={{
        minHeight: "100svh",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <section style={{ textAlign: "center" }}>
        <h1 style={{ margin: 0, fontSize: "clamp(2rem, 8vw, 4rem)" }}>Ludo Live</h1>
        <p style={{ marginTop: 12, opacity: 0.7 }}>Clean rebuild ready.</p>
      </section>
    </main>
  );
}
