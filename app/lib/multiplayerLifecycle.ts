export type OnlinePlayer={playerId:string;name:string;seat:number;color?:string;connected:boolean};
export type OnlineLifecycleState={status:'waiting'|'starting'|'playing'|'finished'|'abandoned';players:OnlinePlayer[];currentPlayerId:string|null;winnerId:string|null;reconnectDeadline:number|null};
export const ONLINE_COLORS=['red','yellow','green','blue'] as const;
export function assignOnlineColors(playerCount:number){if(playerCount===2)return [['red','yellow'],['green','blue']];return Array.from({length:Math.min(4,playerCount)},(_,i)=>[ONLINE_COLORS[i]]);}
export function nextConnectedPlayer(players:OnlinePlayer[],currentId:string){if(!players.length)return null;const i=players.findIndex(p=>p.playerId===currentId);for(let n=1;n<=players.length;n++){const p=players[(i+n+players.length)%players.length];if(p.connected)return p.playerId;}return null;}
export function canStartOnlineMatch(players:OnlinePlayer[],requiredPlayers:number){return players.length===requiredPlayers&&players.every(p=>p.connected);}
export function markDisconnected(state:OnlineLifecycleState,playerId:string,now=Date.now()){const p=state.players.find(x=>x.playerId===playerId);if(p)p.connected=false;if(state.status==='playing'&&state.currentPlayerId===playerId)state.reconnectDeadline=now+30000;return state;}
export function markReconnected(state:OnlineLifecycleState,playerId:string){const p=state.players.find(x=>x.playerId===playerId);if(p)p.connected=true;state.reconnectDeadline=null;return state;}
export function finishMatch(state:OnlineLifecycleState,winnerId:string){state.status='finished';state.winnerId=winnerId;state.currentPlayerId=null;state.reconnectDeadline=null;return state;}
export function abandonMatch(state:OnlineLifecycleState){state.status='abandoned';state.currentPlayerId=null;state.reconnectDeadline=null;return state;}
