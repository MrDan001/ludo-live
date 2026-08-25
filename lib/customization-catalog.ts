export const BOARDS = [
  { id: "classic", name: "Classic Ludo", currency: "coins", price: 0, rarity: "COMMON" },
  { id: "golden", name: "Golden Royal", currency: "gems", price: 50, rarity: "EPIC" },
  { id: "neon", name: "Neon Glow", currency: "gems", price: 100, rarity: "LEGENDARY" },
  { id: "beach", name: "Beach Vibes", currency: "coins", price: 3000, rarity: "RARE" },
  { id: "galaxy", name: "Galaxy Space", currency: "gems", price: 75, rarity: "EPIC" },
  { id: "wood", name: "Wooden Classic", currency: "coins", price: 1000, rarity: "COMMON" },
  { id: "dragon", name: "Dragon Theme", currency: "gems", price: 80, rarity: "EPIC" },
  { id: "christmas", name: "Christmas Edition", currency: "coins", price: 3500, rarity: "RARE" },
  { id: "football", name: "Football Arena", currency: "gems", price: 70, rarity: "EPIC" },
  { id: "candy", name: "Candy Land", currency: "gems", price: 120, rarity: "LEGENDARY" },
  { id: "marble", name: "Marble Luxe", currency: "coins", price: 1000, rarity: "LEGENDARY" },
  { id: "nature", name: "Nature Wood", currency: "coins", price: 600, rarity: "EPIC" },
  { id: "space", name: "Space Galaxy", currency: "coins", price: 1200, rarity: "LEGENDARY" },
  { id: "crystal", name: "Crystal Ice", currency: "coins", price: 900, rarity: "EPIC" },
  { id: "fireice", name: "Fire & Ice", currency: "coins", price: 1500, rarity: "LEGENDARY" },
  { id: "jungle", name: "Jungle Quest", currency: "coins", price: 700, rarity: "EPIC" },
  { id: "love", name: "Love Edition", currency: "coins", price: 800, rarity: "EPIC" },
  { id: "night", name: "Night City", currency: "coins", price: 1000, rarity: "LEGENDARY" },
  { id: "arabian", name: "Arabian Palace", currency: "coins", price: 1300, rarity: "LEGENDARY" },
  { id: "midnight-live", name: "Midnight Live", currency: "gems", price: 130, rarity: "LEGENDARY" },
];

export const DICE = [
  { id: "classic", name: "Classic White", currency: "coins", price: 0, rarity: "COMMON" },
  { id: "golden", name: "Golden Dice", currency: "coins", price: 1500, rarity: "RARE" },
  { id: "crystal", name: "Crystal Blue", currency: "gems", price: 40, rarity: "EPIC" },
  { id: "fire", name: "Fire Dice", currency: "gems", price: 90, rarity: "LEGENDARY" },
  { id: "rainbow", name: "Rainbow Dice", currency: "gems", price: 70, rarity: "EPIC" },
  { id: "diamond", name: "Diamond Dice", currency: "gems", price: 120, rarity: "LEGENDARY" },
  { id: "skull", name: "Skull Dice", currency: "coins", price: 2000, rarity: "RARE" },
  { id: "sports", name: "Sports Dice", currency: "coins", price: 1000, rarity: "COMMON" },
  { id: "neon", name: "Neon Dice", currency: "coins", price: 500, rarity: "LEGENDARY" },
  { id: "galaxy", name: "Galaxy Dice", currency: "coins", price: 1200, rarity: "LEGENDARY" },
  { id: "love", name: "Love Dice", currency: "coins", price: 600, rarity: "EPIC" },
];

export const AVATARS = [
  { id: "avatar-1", name: "Avatar 1", icon: "🧑🏽‍🎮", currency: "gems", price: 500, rarity: "RARE" },
  { id: "avatar-2", name: "Avatar 2", icon: "👩🏽‍🎤", currency: "gems", price: 700, rarity: "RARE" },
  { id: "avatar-3", name: "Avatar 3", icon: "🧔🏾‍♂️", currency: "gems", price: 1000, rarity: "EPIC" },
  { id: "avatar-4", name: "Avatar 4", icon: "👨🏽‍🚀", currency: "gems", price: 1200, rarity: "EPIC" },
  { id: "avatar-5", name: "Avatar 5", icon: "👩🏾‍🚀", currency: "gems", price: 1300, rarity: "EPIC" },
  { id: "avatar-6", name: "Avatar 6", icon: "🧙🏽‍♂️", currency: "gems", price: 2000, rarity: "LEGENDARY" },
] as const;

export const ITEMS = [
  { id: "golden-dice", name: "Golden Dice", description: "Lucky dice skin", icon: "🎲", currency: "gems", price: 500, rarity: "EPIC" },
  { id: "shield", name: "Shield", description: "Animated profile frame", icon: "🛡️", currency: "gems", price: 500, rarity: "EPIC" },
  { id: "trail", name: "Trail", description: "Token movement effect", icon: "🔥", currency: "gems", price: 500, rarity: "EPIC" },
  { id: "crown", name: "Crown", description: "Winner celebration", icon: "👑", currency: "gems", price: 500, rarity: "LEGENDARY" },
] as const;

// Currency packages are first-class Shop products so Admin Shop can price them
// from the same server-authoritative catalogue used by the player purchase flow.
export const COIN_PACKAGES = [
  { id: "coins-500", name: "500 Coins", reward: 500, rewardCurrency: "coins", currency: "gems", price: 25, rarity: "COMMON" },
  { id: "coins-1000", name: "1,000 Coins", reward: 1000, rewardCurrency: "coins", currency: "gems", price: 50, rarity: "COMMON" },
  { id: "coins-2000", name: "2,000 Coins", reward: 2000, rewardCurrency: "coins", currency: "gems", price: 100, rarity: "RARE" },
  { id: "coins-4000", name: "4,000 Coins", reward: 4000, rewardCurrency: "coins", currency: "gems", price: 200, rarity: "RARE" },
  { id: "coins-8000", name: "8,000 Coins", reward: 8000, rewardCurrency: "coins", currency: "gems", price: 400, rarity: "EPIC" },
  { id: "coins-15000", name: "15,000 Coins", reward: 15000, rewardCurrency: "coins", currency: "gems", price: 800, rarity: "EPIC" },
  { id: "coins-20000", name: "20,000 Coins", reward: 20000, rewardCurrency: "coins", currency: "gems", price: 1000, rarity: "LEGENDARY" },
] as const;

export const GEM_PACKAGES = [
  { id: "gems-50", name: "50 Gems", reward: 50, rewardCurrency: "gems", currency: "naira", price: 1000, rarity: "COMMON" },
  { id: "gems-100", name: "100 Gems", reward: 100, rewardCurrency: "gems", currency: "naira", price: 1500, rarity: "COMMON" },
  { id: "gems-200", name: "200 Gems", reward: 200, rewardCurrency: "gems", currency: "naira", price: 2500, rarity: "RARE" },
  { id: "gems-400", name: "400 Gems", reward: 400, rewardCurrency: "gems", currency: "naira", price: 4000, rarity: "RARE" },
  { id: "gems-500", name: "500 Gems", reward: 500, rewardCurrency: "gems", currency: "naira", price: 5000, rarity: "EPIC" },
  { id: "gems-1000", name: "1,000 Gems", reward: 1000, rewardCurrency: "gems", currency: "naira", price: 8000, rarity: "EPIC" },
  { id: "gems-1500", name: "1,500 Gems", reward: 1500, rewardCurrency: "gems", currency: "naira", price: 10000, rarity: "LEGENDARY" },
] as const;

export const CATALOG = [
  ...COIN_PACKAGES.map((x) => ({ ...x, type: "coin_package" as const })),
  ...GEM_PACKAGES.map((x) => ({ ...x, type: "gem_package" as const })),
  ...BOARDS.map((x) => ({ ...x, type: "board" as const })),
  ...DICE.map((x) => ({ ...x, type: "dice" as const })),
  ...AVATARS.map((x) => ({ ...x, type: "avatar" as const })),
  ...ITEMS.map((x) => ({ ...x, type: "item" as const })),
];
