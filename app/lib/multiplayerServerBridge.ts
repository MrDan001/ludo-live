import {MatchCommand,MatchCommandResult,ClientMatchView,canApplyCommand} from './multiplayerProtocol';

/**
 * Pure server-side bridge helpers. The existing Socket.IO server remains the
 * authority for rooms and Ludo state; this module only validates commands and
 * produces safe snapshots. It intentionally has no socket.io dependency so it
 * can be integrated without changing the existing transport in one step.
 */
export function validateCommand(state:ClientMatchView,command:MatchCommand):MatchCommandResult{
  const result=canApplyCommand(state,command);
  return result.ok?{accepted:true,code:'OK'}:{accepted:false,code:result.code};
}

export function nextRevision(state:ClientMatchView):ClientMatchView{
  return {...state,revision:state.revision+1};
}

export function authoritativeSnapshot(state:ClientMatchView):ClientMatchView{
  return {roomId:state.roomId,status:state.status,requiredPlayers:state.requiredPlayers,players:state.players.map(p=>({...p})),currentPlayerId:state.currentPlayerId,winnerId:state.winnerId,startsAt:state.startsAt,reconnectDeadline:state.reconnectDeadline,revision:state.revision};
}
