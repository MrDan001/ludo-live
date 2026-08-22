import type { DemoToken } from "../app/_components/LudoBoard";

export const FINISH_POSITION = 57;

export function isTokenMoveLegal(token: DemoToken, dice: number): boolean {
  if (token.state === "finished") return false;
  if (token.state === "yard") return dice === 6;
  return token.position > 0 && token.position + dice <= FINISH_POSITION;
}

export function legalTokenIds(tokens: DemoToken[], colors: DemoToken["color"][], dice: number): number[] {
  return tokens
    .filter(t => colors.includes(t.color) && isTokenMoveLegal(t, dice))
    .map(t => t.id + (t.color === "green" ? 0 : t.color === "yellow" ? 4 : t.color === "red" ? 8 : 12));
}

export function tokenKey(token: Pick<DemoToken, "color" | "id">): string {
  return `${token.color}-${token.id}`;
}

export function nextTokenPosition(token: DemoToken, dice: number): number {
  return token.state === "yard" ? 1 : token.position + dice;
}

export function cloneTokens(tokens: DemoToken[]): DemoToken[] {
  return tokens.map(t => ({ ...t }));
}
