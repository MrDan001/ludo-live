const colors = {
  green: "#08a63b",
  yellow: "#ffad08",
  red: "#f21b2d",
  blue: "#1769e8",
};

function Token({ color, label }: { color: string; label: string }) {
  return (
    <div className="token-slot" aria-label={`${label} token`}>
      <div className="token" style={{ background: color }} />
    </div>
  );
}

function Home({ color, label }: { color: string; label: string }) {
  return (
    <section className="home" style={{ background: color }}>
      <h2>{label}</h2>
      <div className="tokens">
        {Array.from({ length: 4 }, (_, i) => (
          <Token key={i} color={color} label={label} />
        ))}
      </div>
      <div className="home-player">{label === "Me" ? "M" : "P"}</div>
    </section>
  );
}

const track = Array.from({ length: 33 }, (_, i) => i);

export default function Home() {
  return (
    <main className="game-page">
      <div className="board-wrap">
        <div className="ludo-board" aria-label="Ludo board">
          <Home color={colors.green} label="Player1" />
          <Home color={colors.yellow} label="Player1" />
          <Home color={colors.red} label="Me" />
          <Home color={colors.blue} label="Me" />

          <div className="track" aria-hidden="true">
            {track.map((cell, i) => (
              <div
                className={`track-cell cell-${i}`}
                key={cell}
                style={
                  i >= 11 && i <= 16
                    ? { background: colors.green }
                    : i >= 17 && i <= 22
                      ? { background: colors.yellow }
                      : i >= 23 && i <= 28
                        ? { background: colors.red }
                        : undefined
                }
              >
                {i % 9 === 0 ? "★" : i % 7 === 0 ? "→" : ""}
              </div>
            ))}
          </div>

          <div className="center-home">
            <div className="triangle triangle-green" />
            <div className="triangle triangle-yellow" />
            <div className="triangle triangle-red" />
            <div className="triangle triangle-blue" />
            <div className="ludo-badge">LUDO</div>
          </div>
        </div>
      </div>
    </main>
  );
}
