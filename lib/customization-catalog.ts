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

export const CATALOG = [
  ...BOARDS.map((x) => ({ ...x, type: "board" as const })),
  ...DICE.map((x) => ({ ...x, type: "dice" as const })),
];
