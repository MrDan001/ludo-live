export type OnlinePlayer={playerId:string;name:string;seat:number;color?:string;connected:boolean};
export type OnlineLifecycleState={status:'waiting'|'starting'|'playing'|'finished'|'abandoned';players:OnlinePlayer[];currentPlayerId:string|null;winnerId:string|null;reconnectDeadline:number|null};
export const ONLINE_COLORS=['red','yellow','green','blue'] as const;
export function assignOnlineColors(playerCount:number){if(playerCount===2)return [['red','yellow'],['green','blue']];return Array.from({length:Math.min(4,playerCount)},(_,i)=>[ONLINE_COLORS[i]]);}
export function nextConnectedPlayer(players:OnlinePlayer[],currentId:string){if(!players.length)return null;const i=players.findIndex(p=>p.playerId===currentId);for(let n=1;n<=players.length;n++){const p=players[(i+n+players.length)%players.length];if(p.connected)return p.playerId;}return null;}
export function canStartOnlineMatch(players:OnlinePlayer[],requiredPlayers:number){return players.length===requiredPlayers&&players.every(p=>p.connected);}
