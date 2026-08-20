"use client";

const COLORS = {
  green: "#16a34a",
  yellow: "#f4b400",
  red: "#ef233c",
  blue: "#2563eb",
} as const;

const BOARD_ROUTE: [number, number][] = [
  [14,6],[13,6],[12,6],[11,6],[10,6],[9,6],
  [8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],
  [6,0],[6,1],[6,2],[6,3],[6,4],[6,5],
  [5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],
  [1,8],[2,8],[3,8],[4,8],[5,8],
  [6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],
  [8,14],[8,13],[8,12],[8,11],[8,10],[8,9],
  [9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],
];

const route = new Set(BOARD_ROUTE.map(([r, c]) => `${r}-${c}`));
const safe = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
const BLUE_EXIT = "8-14";

const LANES: Record<keyof typeof COLORS, [number, number][]> = {
  red: [[13,7],[12,7],[11,7],[10,7],[9,7]],
  green: [[7,1],[7,2],[7,3],[7,4],[7,5]],
  yellow: [[1,7],[2,7],[3,7],[4,7],[5,7]],
  blue: [[7,9],[7,10],[7,11],[7,12],[7,13]],
};

const laneMap = new Map<string, keyof typeof COLORS>();
(Object.keys(LANES) as (keyof typeof COLORS)[]).forEach((color) => {
  LANES[color].forEach(([r, c]) => laneMap.set(`${r}-${c}`, color));
});

function Home({ color, className }: { color: keyof typeof COLORS; className: string }) {
  return (
    <div className={`home ${className}`} style={{ background: COLORS[color] }}>
      <div className="home-yard">
        {[0, 1, 2, 3].map((slot) => <span key={slot} />)}
      </div>
    </div>
  );
}

function Center() {
  return (
    <div className="center">
      <div className="center-triangle center-green" />
      <div className="center-triangle center-yellow" />
      <div className="center-triangle center-red" />
      <div className="center-triangle center-blue" />
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="board-page">
      <div className="ludo-board" aria-label="Ludo board">
        <div className="grid">
          {Array.from({ length: 225 }, (_, index) => {
            const row = Math.floor(index / 15);
            const col = index % 15;
            const key = `${row}-${col}`;
            const laneColor = laneMap.get(key);
            const routeIndex = BOARD_ROUTE.findIndex(([r, c]) => r === row && c === col);

            if (route.has(key)) {
              const isBlueExit = key === BLUE_EXIT;
              return (
                <div key={key} className={`cell path ${safe.has(routeIndex) ? "safe" : ""} ${isBlueExit ? "blue-exit" : ""}`}>
                  {safe.has(routeIndex) && <span className="safe-star">★</span>}
                </div>
              );
            }
            if (laneColor) return <div key={key} className={`cell home-lane lane-${laneColor}`} />;
            return <div key={key} className="cell empty" />;
          })}
        </div>
        <Home color="green" className="home-green" />
        <Home color="yellow" className="home-yellow" />
        <Home color="red" className="home-red" />
        <Home color="blue" className="home-blue" />
        <Center />
      </div>
    </main>
  );
}
