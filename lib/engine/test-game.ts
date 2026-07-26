import {
    createInitialGameState,
    GameState,
    PlayerColor,
  } from "./gameState";
  import { rollTwoDice } from "./dice";
  import { getValidMoves, applyMove, getNextTurnColor } from "./moves";
  import { chooseAIMove } from "./ai";
  
  function runSimulatedGame() {
    const activeColors: PlayerColor[] = ["RED", "GREEN", "YELLOW", "BLUE"];
    const aiColors: PlayerColor[] = ["RED", "GREEN", "YELLOW", "BLUE"];
  
    let state = createInitialGameState(activeColors, aiColors);
    let consecutiveSixes = 0;
    let turnCount = 0;
    const MAX_TURNS = 2000;
  
    console.log("=== Ludo Live engine test: 2-dice simulated 4-player AI game ===\n");
  
    while (!state.winner && turnCount < MAX_TURNS) {
      turnCount++;
      const roll = rollTwoDice();
      consecutiveSixes = roll.hasSix ? consecutiveSixes + 1 : 0;
  
      const moves = getValidMoves(state, roll);
  
      if (moves.length === 0) {
        console.log(`[${state.currentTurnColor}] rolled ${roll.d1}+${roll.d2} -> no valid moves`);
        state = { ...state, currentTurnColor: getNextTurnColor(state, roll, consecutiveSixes) };
        continue;
      }
  
      if (consecutiveSixes >= 3) {
        console.log(`[${state.currentTurnColor}] three 6-rolls in a row -> forfeited`);
        consecutiveSixes = 0;
        state = { ...state, currentTurnColor: getNextTurnColor(state, roll, 3) };
        continue;
      }
  
      const chosenMove = chooseAIMove(state, roll);
      if (!chosenMove) continue;
  
      state = applyMove(state, chosenMove);
      const player = state.players.find((p) => p.color === state.currentTurnColor)!;
      const positions = player.tokens.map((t) => `${t.id}:${t.position}`).join(", ");
      console.log(`[${state.currentTurnColor}] rolled ${roll.d1}+${roll.d2}=${roll.sum} -> ${positions}`);
  
      if (state.winner) {
        console.log(`\n🏆 ${state.winner} wins after ${turnCount} turns!`);
        break;
      }
  
      state = { ...state, currentTurnColor: getNextTurnColor(state, roll, consecutiveSixes) };
    }
  
    if (!state.winner) {
      console.log(`\n⚠️ No winner after ${MAX_TURNS} turns.`);
    }
  }
  
  runSimulatedGame();