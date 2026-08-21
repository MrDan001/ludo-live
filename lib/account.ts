export type PlayerAccount={
 id:string;
 username:string;
 email:string;
 passwordHash:string;
 createdAt:number;
 coins:number;
 gems:number;
 xp:number;
 level:number;
 isGuest?:boolean;
};

const KEY="ludo-account";
const DEFAULT_COINS=1000;
const DEFAULT_GEMS=10;

export function getAccount():PlayerAccount|null{
 if(typeof window==="undefined")return null;
 try{const raw=localStorage.getItem(KEY);return raw?JSON.parse(raw):null}catch{return null}
}

export function isLoggedIn(){return !!getAccount()}

function saveAccount(account:PlayerAccount){
 localStorage.setItem(KEY,JSON.stringify(account));
 syncLegacyProfile(account);
 return account;
}

async function authRequest(action:string,payload:Record<string,unknown>={}){
 const response=await fetch("/api/auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,...payload})});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(data?.error||"Authentication failed.");
 return data.user as PlayerAccount;
}

export async function createAccount(username:string,email:string,password:string){
 const cleanUsername=username.trim().slice(0,24);
 const cleanEmail=email.trim().toLowerCase();
 if(cleanUsername.length<3)throw new Error("Username must be at least 3 characters.");
 if(!/^\S+@\S+\.\S+$/.test(cleanEmail))throw new Error("Enter a valid email address.");
 if(password.length<6)throw new Error("Password must be at least 6 characters.");
 const account=await authRequest("register",{username:cleanUsername,email:cleanEmail,password});
 localStorage.setItem("ludo-account-created","1");
 return saveAccount(account);
}

export async function continueAsGuest(){
 const account=await authRequest("guest");
 localStorage.setItem("ludo-guest","1");
 return saveAccount(account);
}

export async function loginAccount(usernameOrEmail:string,password:string){
 const identifier=usernameOrEmail.trim().toLowerCase();
 if(!identifier)throw new Error("Enter your username or email.");
 const account=await authRequest("login",{identifier,password});
 localStorage.removeItem("ludo-guest");
 return saveAccount(account);
}

export async function restoreSession(){
 if(typeof window==="undefined")return null;
 try{
  const response=await fetch("/api/auth",{cache:"no-store"});
  if(!response.ok)return null;
  const data=await response.json();
  if(!data?.user)return null;
  return saveAccount(data.user as PlayerAccount);
 }catch{return null}
}

export async function logoutAccount(){
 if(typeof window==="undefined")return;
 try{await fetch("/api/auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"logout"})});}catch{}
 localStorage.removeItem(KEY);
 localStorage.removeItem("ludo-guest");
 localStorage.removeItem("ludo-account-created");
 ["ludo-player-id","ludo-player-name","ludo-level","ludo-xp","ludo-wallet"].forEach(k=>localStorage.removeItem(k));
 window.dispatchEvent(new Event("ludo-profile-updated"));
}

export function syncLegacyProfile(account:PlayerAccount){
 if(typeof window==="undefined")return;
 localStorage.setItem("ludo-player-id",account.id);
 localStorage.setItem("ludo-player-name",account.username);
 localStorage.setItem("ludo-level",String(account.level));
 localStorage.setItem("ludo-xp",String(account.xp));
 localStorage.setItem("ludo-wallet",JSON.stringify({coins:account.coins,gems:account.gems,spins:0,mystery:0}));
 window.dispatchEvent(new Event("ludo-profile-updated"));
 window.dispatchEvent(new Event("ludo-wallet-updated"));
 window.dispatchEvent(new Event("ludo-progression-updated"));
}

export function updateAccount(patch:Partial<PlayerAccount>){
 const account=getAccount();if(!account)throw new Error("Please sign in first.");
 const next={...account,...patch};localStorage.setItem(KEY,JSON.stringify(next));syncLegacyProfile(next);return next;
}

export {DEFAULT_COINS,DEFAULT_GEMS};
