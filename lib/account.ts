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
};

const KEY="ludo-account";
const DEFAULT_COINS=1000;
const DEFAULT_GEMS=10;

export function getAccount():PlayerAccount|null{
 if(typeof window==="undefined")return null;
 try{const raw=localStorage.getItem(KEY);return raw?JSON.parse(raw):null}catch{return null}
}

export function isLoggedIn(){return !!getAccount()}

export async function hashPassword(password:string){
 const data=new TextEncoder().encode(password);
 const digest=await crypto.subtle.digest("SHA-256",data);
 return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");
}

export async function createAccount(username:string,email:string,password:string){
 const cleanUsername=username.trim().slice(0,24);
 const cleanEmail=email.trim().toLowerCase();
 if(cleanUsername.length<3)throw new Error("Username must be at least 3 characters.");
 if(!/^\S+@\S+\.\S+$/.test(cleanEmail))throw new Error("Enter a valid email address.");
 if(password.length<6)throw new Error("Password must be at least 6 characters.");
 const account:PlayerAccount={id:crypto.randomUUID(),username:cleanUsername,email:cleanEmail,passwordHash:await hashPassword(password),createdAt:Date.now(),coins:DEFAULT_COINS,gems:DEFAULT_GEMS,xp:0,level:0};
 localStorage.setItem(KEY,JSON.stringify(account));
 syncLegacyProfile(account);
 return account;
}

export async function loginAccount(usernameOrEmail:string,password:string){
 const account=getAccount();
 if(!account)throw new Error("No account is saved on this device yet. Create an account first.");
 const identifier=usernameOrEmail.trim().toLowerCase();
 const matches=account.username.toLowerCase()===identifier||account.email===identifier;
 if(!matches||account.passwordHash!==await hashPassword(password))throw new Error("Incorrect account details.");
 syncLegacyProfile(account);
 return account;
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
 const account=getAccount();if(!account)throw new Error("Please create an account first.");
 const next={...account,...patch};localStorage.setItem(KEY,JSON.stringify(next));syncLegacyProfile(next);return next;
}

export {DEFAULT_COINS,DEFAULT_GEMS};
