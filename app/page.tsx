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

function Home({ color, name }: { color: Color; name: string }) {
  return (
    <section className="home" style={{ backgroundColor: color }}>
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
  const isGreenPath = col === 7 && row >= 1 && row <= 5;
  const isYellowPath = row === 7 && col >= 9 && col <= 13;
  const isRedPath = col === 7 && row >= 9 && row <= 13;
  const isBluePath = row === 7 && col >= 1 && col <= 5;
  const isStart = (row === 6 && col === 1) || (row === 1 && col === 8) || (row === 8 && col === 13) || (row === 13 && col === 6);
  const isSafe = (row + col) % 11 === 0;

  let className = "track-cell";
  if (isGreenPath) className += " green-path";
  if (isYellowPath) className += " yellow-path";
  if (isRedPath) className += " red-path";
  if (isBluePath) className += " blue-path";
  if (isStart) className += " start-cell";
  if (isSafe) className += " safe-cell";

  let mark = "";
  if (isSafe) mark = "★";
  else if (row === 7 && col === 2) mark = "→";
  else if (row === 2 && col === 7) mark = "↓";
  else if (row === 12 && col === 7) mark = "↑";
  else if (row === 7 && col === 12) mark = "←";

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
                const inCross = row >= 6 && row <= 8 || col >= 6 && col <= 8;
                return inCross ? <TrackCell key={`${row}-${col}`} row={row} col={col} /> : <div key={`${row}-${col}`} className="empty-cell" />;
              }),
            )}
          </div>

          <Home color={COLORS.green} name="Player1" />
          <Home color={COLORS.yellow} name="Player1" />
          <Home color={COLORS.red} name="Me" />
          <Home color={COLORS.blue} name="Me" />

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
