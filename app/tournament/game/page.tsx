"use client";
import TournamentBotGame from "../../game/TournamentBotGame";

export default function TournamentGamePage(){
  return (
    <div id="tournament-game-shell">
      <style>{`
        html, body { height: 100%; overflow: hidden !important; }
        #tournament-game-shell { position: fixed; inset: 0; width: 100vw; height: 100dvh; overflow: hidden; }
        #tournament-game-shell > main { min-height: 100dvh !important; height: 100dvh !important; box-sizing: border-box !important; padding: 0 !important; overflow: hidden !important; }
        #tournament-game-shell > main > div { max-width: none !important; width: 100%; height: 100%; margin: 0 !important; }
        #tournament-game-shell > main > div > main { max-width: 720px !important; width: 100% !important; height: 100dvh !important; min-height: 0 !important; box-sizing: border-box !important; margin: 0 auto !important; padding: 8px 12px !important; overflow: hidden !important; grid-template-rows: auto auto auto !important; align-content: start !important; gap: 8px !important; }
        #tournament-game-shell > main > div > main > section:first-of-type { width: 100% !important; height: min(calc(100vw - 24px), calc(100dvh - 190px)) !important; max-height: calc(100dvh - 190px) !important; min-height: 0 !important; }
        #tournament-game-shell > main > div > main > section:first-of-type > * { width: 100% !important; height: 100% !important; max-height: 100% !important; }
      `}</style>
      <TournamentBotGame/>
    </div>
  );
}
