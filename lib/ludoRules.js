const COLORS = ["red", "yellow", "green", "blue"];
const START_INDEX = { green: 0, yellow: 13, blue: 26, red: 39 };
const TRACK_LENGTH = 51;
const PHYSICAL_TRACK_LENGTH = 52;
const HOME_START = 52;
const HOME_STRETCH = 5;
const FINISH = 57;
const MAIN_PATH = [
  ...Array.from({length:5},(_,i)=>[6,i+1]), ...Array.from({length:6},(_,i)=>[5-i,6]), [0,7],[0,8],
  ...Array.from({length:5},(_,i)=>[i+1,8]), ...Array.from({length:6},(_,i)=>[6,i+9]), [7,14],[8,14],
  ...Array.from({length:5},(_,i)=>[8,13-i]), ...Array.from({length:6},(_,i)=>[9+i,8]), [14,7],[14,6],
  ...Array.from({length:5},(_,i)=>[13-i,6]), ...Array.from({length:6},(_,i)=>[8,5-i]), [7,0],[6,0]
];
const HOME_LANES = {
  green:[[7,1],[7,2],[7,3],[7,4],[7,5]], yellow:[[1,7],[2,7],[3,7],[4,7],[5,7]],
  red:[[13,7],[12,7],[11,7],[10,7],[9,7]], blue:[[7,13],[7,12],[7,11],[7,10],[7,9]]
};
const SAFE_CELLS = [{row:6,col:1,color:"green"},{row:1,col:8,color:"yellow"},{row:13,col:6,color:"red"},{row:8,col:13,color:"blue"}];
const TEAM_BY_COLOR = { red:"human", yellow:"human", green:"bot", blue:"bot" };
const same=(a,b)=>!!a&&!!b&&a[0]===b[0]&&a[1]===b[1];
const sameTeam=(a,b)=>TEAM_BY_COLOR[a]===TEAM_BY_COLOR[b];
function getTrackCell(color,progress){if(progress<1||progress>TRACK_LENGTH)return null;return MAIN_PATH[(START_INDEX[color]+progress-1)%PHYSICAL_TRACK_LENGTH]||null}
function getHomeCell(color,progress){const i=progress-HOME_START;return i>=0&&i<HOME_STRETCH?HOME_LANES[color]?.[i]||null:null}
function getTokenCell(color,progress){if(progress>=1&&progress<=TRACK_LENGTH)return getTrackCell(color,progress);if(progress>=HOME_START&&progress<FINISH)return getHomeCell(color,progress);return null}
function tokenState(progress){if(progress<=0)return "yard";if(progress<=TRACK_LENGTH)return "track";if(progress<FINISH)return "home";return "finished"}
function nextProgress(position,dice){if(position===0)return dice===6?1:null;const n=position+dice;return n<=FINISH?n:null}
function isSafeProgress(color,progress){const cell=getTokenCell(color,progress);return SAFE_CELLS.some(s=>same(cell,[s.row,s.col]))}
function opponentsAt(tokens,color,progress){const cell=getTokenCell(color,progress);if(!cell)return [];return tokens.filter(t=>t.position>0&&t.position<FINISH&&!sameTeam(t.color,color)&&same(getTokenCell(t.color,t.position),cell))}
function canMove(tokens,token,dice){
 if(!token||token.position>=FINISH||token.state==="finished")return false;
 if(token.position===0)return dice===6;
 const target=token.position+dice;if(target>FINISH)return false;
 for(let step=token.position+1;step<=Math.min(target,HOME_START);step++){
  const cell=getTokenCell(token.color,step);if(!cell)return false;
  const occupants=tokens.filter(t=>t.position>0&&t.position<FINISH&&same(getTokenCell(t.color,t.position),cell));
  if(occupants.filter(t=>!sameTeam(t.color,token.color)).length>=2)return false;
 }
 if(target===FINISH)return true;
 const targetCell=getTokenCell(token.color,target);if(!targetCell)return false;
 const occupants=tokens.filter(t=>t.position>0&&t.position<FINISH&&same(getTokenCell(t.color,t.position),targetCell));
 return occupants.filter(t=>!sameTeam(t.color,token.color)).length<2;
}
function legalMoves(tokens,colors,dice){return tokens.filter(t=>colors.includes(t.color)&&canMove(tokens,t,dice))}
function hasLegalMove(tokens,colors,dice){return legalMoves(tokens,colors,dice).length>0}
function applyMove(tokens,token,dice){
 if(!canMove(tokens,token,dice))return null;const target=nextProgress(token.position,dice);if(target===null)return null;
 let moved=tokens.map(item=>item.color===token.color&&item.id===token.id?{...item,position:target,state:tokenState(target)}:item);let captured=null;
 if(target<HOME_START&&!isSafeProgress(token.color,target)){
  const opponents=opponentsAt(moved,token.color,target);
  if(opponents.length===1){
   captured=opponents[0];
   moved=moved.map(item=>item.color===captured.color&&item.id===captured.id?{...item,position:0,state:"yard"}:item);
   // Bot-vs-Human rule: a successful single-token kill sends the killer
   // to the small finish/kill square (the canonical finished position).
   moved=moved.map(item=>item.color===token.color&&item.id===token.id?{...item,position:FINISH,state:"finished"}:item);
  }
 }
 return {tokens:moved,target,captured};
}
function hasWon(tokens,colors){const owned=tokens.filter(t=>colors.includes(t.color));return owned.length===colors.length*4&&owned.every(t=>t.position>=FINISH||t.state==="finished")}
function winner(tokens,humanColors=["red","yellow"],botColors=["green","blue"]){if(hasWon(tokens,humanColors))return "human";if(hasWon(tokens,botColors))return "bot";return null}
function playerColorsForSeats(playerCount,seat){if(playerCount===2)return seat===0?["red","yellow"]:["green","blue"];return [COLORS[seat]||"red"]}
module.exports={COLORS,START_INDEX,TRACK_LENGTH,PHYSICAL_TRACK_LENGTH,HOME_START,HOME_STRETCH,FINISH,MAIN_PATH,HOME_LANES,SAFE_CELLS,getTrackCell,getHomeCell,getTokenCell,tokenState,nextProgress,isSafeProgress,opponentsAt,canMove,legalMoves,hasLegalMove,applyMove,hasWon,winner,playerColorsForSeats};