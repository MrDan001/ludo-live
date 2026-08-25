import {NextRequest,NextResponse} from "next/server";
import {pool,ensureAuthSchema} from "../../auth/_db";
import {ensureTournamentV2Schema} from "../../tournaments/_schema";
import {currentUser} from "../../../../lib/auth-session";
import {getNextMilestone,getLevelRewardPlan} from "../../../../lib/levelRewards";

export const dynamic="force-dynamic";

function titleFor(hours:number){
  if(hours>=2000)return{id:"immortal",label:"Immortal",icon:"⚔️"};
  if(hours>=1500)return{id:"grandmaster",label:"Grandmaster",icon:"⚔️"};
  if(hours>=1000)return{id:"legend",label:"Legend",icon:"⚔️"};
  if(hours>=750)return{id:"mastermind",label:"Mastermind",icon:"🦋"};
  if(hours>=500)return{id:"champion",label:"Champion",icon:"🦋"};
  if(hours>=300)return{id:"prodigy",label:"Prodigy",icon:"🦋"};
  if(hours>=100)return{id:"expert",label:"Expert",icon:"🦋"};
  if(hours>=60)return{id:"fanatic",label:"Fanatic",icon:"🦋"};
  if(hours>=40)return{id:"devotee",label:"Devotee",icon:"🦋"};
  if(hours>=20)return{id:"enthusiast",label:"Enthusiast",icon:"🦋"};
  if(hours>=10)return{id:"hobbyist",label:"Hobbyist",icon:"🦋"};
  if(hours>=3)return{id:"dabbler",label:"Dabbler",icon:"🦋"};
  if(hours>=1)return{id:"rookie",label:"Rookie",icon:"🦋"};
  return{id:"on-your-way",label:"On Your Way",icon:"🦋"};
}

const WIN_ACHIEVEMENT_MILESTONES=[1,10,25,50,100,250,500];

export async function GET(req:NextRequest,{params}:{params:Promise<{username:string}>}){
  try{
    await ensureAuthSchema();
    await ensureTournamentV2Schema();
    await pool.query(`CREATE TABLE IF NOT EXISTS ludo_spin_state(user_id TEXT PRIMARY KEY REFERENCES ludo_users(id) ON DELETE CASCADE,last_free_spin DATE,spins INTEGER NOT NULL DEFAULT 0,total_spins INTEGER NOT NULL DEFAULT 0,active_seconds INTEGER NOT NULL DEFAULT 0,total_active_seconds INTEGER NOT NULL DEFAULT 0,last_heartbeat_at TIMESTAMPTZ);`);
    await pool.query("ALTER TABLE ludo_spin_state ADD COLUMN IF NOT EXISTS total_active_seconds INTEGER NOT NULL DEFAULT 0");
    const viewer=await currentUser(req);
    if(!viewer)return NextResponse.json({error:"Login required."},{status:401});
    const{username}=await params;
    const target=await pool.query(`SELECT id,username,level,xp,owned_boards,owned_dice,owned_avatars,equipped_board,equipped_dice,equipped_avatar FROM ludo_users WHERE LOWER(username)=LOWER($1) AND is_banned=FALSE LIMIT 1`,[decodeURIComponent(username)]);
    const u=target.rows[0];
    if(!u)return NextResponse.json({error:"Player not found."},{status:404});

    await pool.query(`CREATE TABLE IF NOT EXISTS ludo_match_history(id BIGSERIAL PRIMARY KEY,user_id TEXT NOT NULL REFERENCES ludo_users(id) ON DELETE CASCADE,opponent_id TEXT,opponent_name TEXT NOT NULL DEFAULT 'Player',result TEXT NOT NULL CHECK(result IN ('win','loss')),mode TEXT NOT NULL DEFAULT 'Online',room_code TEXT,match_key TEXT NOT NULL,played_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),xp INTEGER NOT NULL DEFAULT 0,UNIQUE(user_id,match_key));`);
    await pool.query(`CREATE TABLE IF NOT EXISTS ludo_level_rewards(user_id TEXT NOT NULL REFERENCES ludo_users(id) ON DELETE CASCADE,level INTEGER NOT NULL,coins INTEGER NOT NULL DEFAULT 0,gems INTEGER NOT NULL DEFAULT 0,badge_id TEXT,title TEXT NOT NULL,claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(user_id,level));`);

    const[games,tournaments,rewards,activity]=await Promise.all([
      pool.query(`SELECT COUNT(*)::int total,COUNT(*) FILTER(WHERE result='win')::int wins,COUNT(*) FILTER(WHERE result='loss')::int losses FROM ludo_match_history WHERE user_id=$1`,[u.id]),
      pool.query(`SELECT COUNT(*) FILTER(WHERE badge_type='gold')::int wins,COUNT(*) FILTER(WHERE badge_type IN ('gold','silver','bronze'))::int podiums,COUNT(*)::int badges FROM ludo_tournament_badges WHERE user_id=$1`,[u.id]),
      pool.query(`SELECT level,title,badge_id,coins,gems,claimed_at FROM ludo_level_rewards WHERE user_id=$1 ORDER BY level DESC`,[u.id]),
      pool.query(`SELECT total_active_seconds,active_seconds FROM ludo_spin_state WHERE user_id=$1`,[u.id])
    ]);

    const stats=games.rows[0]||{};
    const wins=Number(stats.wins||0);
    const tournamentWins=Number(tournaments.rows[0]?.wins||0);
    const tournamentBadges=Number(tournaments.rows[0]?.badges||0);
    const level=Math.max(1,Number(u.level)||1);
    const milestoneRewards=rewards.rows.map((r:any)=>({level:Number(r.level),title:r.title,badgeId:r.badge_id,coins:Number(r.coins||0),gems:Number(r.gems||0),claimedAt:r.claimed_at}));
    const totalActiveSeconds=Number(activity.rows[0]?.total_active_seconds||0)+Number(activity.rows[0]?.active_seconds||0);
    const activeHours=Math.floor(totalActiveSeconds/3600);

    // Showcase Achievements are unique earned achievement/badge unlocks, not raw
    // win/tournament-event counts. Individual wins remain in the Wins stat.
    const winAchievements=WIN_ACHIEVEMENT_MILESTONES.filter(n=>wins>=n).length;
    const achievementCount=milestoneRewards.length+winAchievements+tournamentBadges;
    const prestige=Math.floor((level-1)/100);
    const title=titleFor(activeHours);

    const ownedBoards=Array.isArray(u.owned_boards)?u.owned_boards:[];
    const ownedDice=Array.isArray(u.owned_dice)?u.owned_dice:[];
    const ownedAvatars=Array.isArray(u.owned_avatars)?u.owned_avatars:[];
    const next=getNextMilestone(level);
    const nextPlan=getLevelRewardPlan(next.level);
    const nextMilestone={level:next.level,title:`Level ${next.level} Milestone`,unlocks:nextPlan.unlock?[{name:nextPlan.unlock.name,type:nextPlan.unlock.type,icon:nextPlan.unlock.icon}]:[]};

    return NextResponse.json({
      player:{id:u.id,username:u.username,level,xp:Number(u.xp||0),equipped:{board:u.equipped_board,dice:u.equipped_dice,avatar:u.equipped_avatar},ownedCounts:{boards:ownedBoards.length,dice:ownedDice.length,avatars:ownedAvatars.length},activeHours,totalActiveSeconds},
      title,
      prestige,
      stats:{games:Number(stats.total||0),wins,losses:Number(stats.losses||0),tournamentWins,achievements:achievementCount},
      trophyRoom:{levelRewards:milestoneRewards.slice(0,12),totalLevelRewards:milestoneRewards.length,earnedMilestones:milestoneRewards.map(r=>r.level)},
      isSelf:viewer.id===u.id,
      nextMilestone
    });
  }catch(e){
    console.error("player showcase GET",e);
    return NextResponse.json({error:"Player showcase unavailable."},{status:500});
  }
}
