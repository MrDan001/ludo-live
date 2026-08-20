const COLORS = {
  green: "#08a63b",
  yellow: "#ffad08",
  red: "#f21b2d",
  blue: "#1769e8",
} as const;

type Color = (typeof COLORS)[keyof typeof COLORS];

function Token({ color, name }: { color: Color; name: string }) {
  return (
    <div className="token-slot" aria-label={`${name} token`}>
      <div className="token" style={{ background: color }} />
    </div>
  );
}

function Home({ color, name, className }: { color: Color; name: string; className: string }) {
  return (
    <section className={`home ${className}`} style={{ backgroundColor: color }}>
      <h2>{name}</h2>
      <div className="tokens">
        {Array.from({ length: 4 }, (_, i) => (
          <Token key={i} color={color} name={name} />
        ))}
      </div>
    </section>
  );
}

function TrackCell({ row, col }: { row: number; col: number }) {
  // Six-square colored home lanes running from each home toward the center.
  const isGreenPath = col === 7 && row >= 0 && row <= 5;
  const isYellowPath = row === 7 && col >= 9 && col <= 14;
  const isRedPath = col === 7 && row >= 9 && row <= 14;
  const isBluePath = row === 7 && col >= 0 && col <= 5;

  const isStart =
    (row === 6 && col === 1) ||
    (row === 1 && col === 8) ||
    (row === 8 && col === 13) ||
    (row === 13 && col === 6);

  const safeSquares = new Set(["6-2", "2-8", "8-12", "12-6"]);
  const isSafe = safeSquares.has(`${row}-${col}`);

  let className = "track-cell";
  if (isGreenPath) className += " green-path";
  else if (isYellowPath) className += " yellow-path";
  else if (isRedPath) className += " red-path";
  else if (isBluePath) className += " blue-path";
  else if (isSafe) className += " safe-cell";
  else if (isStart) className += " start-cell";

  let mark = "";
  if (isSafe) mark = "★";
  else if (row === 7 && col === 1) mark = "→";
  else if (row === 1 && col === 7) mark = "↓";
  else if (row === 13 && col === 7) mark = "↑";
  else if (row === 7 && col === 13) mark = "←";

  return <div className={className}>{mark}</div>;
}

export default function HomePage() {
  return (
    <main className="game-page">
      <div className="board-wrap">
        <div className="ludo-board" aria-label="Ludo board">
          <div className="track" aria-hidden="true">
            {Array.from({ length: 15 }, (_, row) =>
              Array.from({ length: 15 }, (_, col) => {
                const inCross = (row >= 6 && row <= 8) || (col >= 6 && col <= 8);
                return inCross ? (
                  <TrackCell key={`${row}-${col}`} row={row} col={col} />
                ) : (
                  <div key={`${row}-${col}`} className="empty-cell" />
                );
              }),
            )}
          </div>

          <Home color={COLORS.green} name="Player1" className="home-green" />
          <Home color={COLORS.yellow} name="Player1" className="home-yellow" />
          <Home color={COLORS.red} name="Me" className="home-red" />
          <Home color={COLORS.blue} name="Me" className="home-blue" />

          <div className="center-home" aria-label="Ludo center">
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
