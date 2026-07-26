export interface DiceRoll {
    d1: number;
    d2: number;
    sum: number;
    hasSix: boolean;
  }
  
  export function rollTwoDice(): DiceRoll {
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    return { d1, d2, sum: d1 + d2, hasSix: d1 === 6 || d2 === 6 };
  }