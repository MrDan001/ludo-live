export type WorldMode = "arena" | "speed" | "teams" | "chaos" | "boss" | "tournament";

export type WorldModeConfig = { id: WorldMode; title: string; eyebrow: string; subtitle: string; icon: string; accent: string; rules: string[]; turnSeconds?: number; seriesToWin?: number };

export const WORLD_MODES: WorldModeConfig[] = [
  { id:"arena", title:"Ranked Arena", eyebrow:"RANKED BATTLE", subtitle:"Classic Ludo rules with a World ranking mindset.", icon:"⚔️", accent:"#4f8cff", rules:["Standard movement","Capture opponents","Six gives another turn"] },
  { id:"speed", title:"Speed Ludo", eyebrow:"10S TURNS", subtitle:"Think fast. Every human turn has a ten-second clock.", icon:"⚡", accent:"#35d57b", turnSeconds:10, rules:["10-second human turns","Timeout skips the turn","One roll per turn"] },
  { id:"teams", title:"Team Clash", eyebrow:"2 VS 2", subtitle:"You and your ally face the World team.", icon:"👥", accent:"#b77cff", rules:["Red + Yellow vs Green + Blue","Six gives another turn","Team wins together"] },
  { id:"chaos", title:"Chaos Ludo", eyebrow:"UNPREDICTABLE", subtitle:"Normal movement, with surprise turn swings.", icon:"🌪️", accent:"#ff9f43", rules:["Standard movement","Random extra turns","Six gives another turn"] },
  { id:"boss", title:"Boss Battle", eyebrow:"ELITE BOSS", subtitle:"An aggressive World opponent that prioritizes pressure.", icon:"👹", accent:"#ff5a6f", rules:["Aggressive AI","Captures are prioritized","Six gives another turn"] },
  { id:"tournament", title:"World Tournament", eyebrow:"BEST OF 3", subtitle:"Win two rounds and take the match.", icon:"🏆", accent:"#f7c948", seriesToWin:2, rules:["Best of three rounds","First to two wins","Six gives another turn"] }
];

export function getWorldMode(id: WorldMode) { return WORLD_MODES.find(function (mode) { return mode.id === id; })!; }
