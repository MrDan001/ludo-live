const assert = require("node:assert/strict");
const rules = require("./ludoRules.js");

const token = (color, id, position) => ({ color, id, position, state: rules.tokenState(position) });
const empty = rules.COLORS.flatMap(color => [0, 1, 2, 3].map(id => token(color, id, 0)));

// Entry: yard tokens may enter only on a six.
assert.equal(rules.canMove(empty, token("red", 0, 0), 5), false);
assert.equal(rules.canMove(empty, token("red", 0, 0), 6), true);

// Exact finish: overshooting the finish is illegal.
assert.equal(rules.canMove(empty, token("red", 0, 56), 2), false);
assert.equal(rules.canMove(empty, token("red", 0, 56), 1), true);

// Safe start squares cannot be captured.
const safeVictim = token("green", 0, 1);
const redAtGreenStart = token("red", 0, 40);
const safeState = empty.map(t =>
  t.color === "green" && t.id === 0 ? safeVictim :
  t.color === "red" && t.id === 0 ? redAtGreenStart : t
);
const safeResult = rules.applyMove(safeState, redAtGreenStart, 1);
assert.ok(safeResult);
assert.equal(safeResult.captured, null);

// A single opponent on a non-safe destination is captured.
const redMover = token("red", 0, 39);
const greenVictim = token("green", 0, 13);
const captureState = empty.map(t =>
  t.color === "red" && t.id === 0 ? redMover :
  t.color === "green" && t.id === 0 ? greenVictim : t
);
const captureResult = rules.applyMove(captureState, redMover, 1);
assert.ok(captureResult);
assert.equal(captureResult.captured?.color, "green");
assert.equal(captureResult.tokens.find(t => t.color === "green" && t.id === 0).position, 0);

// Two opponents on the same destination form a blockade and cannot be entered.
const blockade = empty.map(t =>
  t.color === "red" && t.id === 0 ? token("red", 0, 39) :
  t.color === "green" && t.id === 0 ? token("green", 0, 13) :
  t.color === "blue" && t.id === 0 ? token("blue", 0, 26) : t
);
assert.equal(rules.canMove(blockade, token("red", 0, 39), 1), false);

// Two-player seats preserve the restored Bot-vs-Human colour split.
assert.deepEqual(rules.playerColorsForSeats(2, 0), ["red", "yellow"]);
assert.deepEqual(rules.playerColorsForSeats(2, 1), ["green", "blue"]);

// Four-player seats receive one colour each.
assert.deepEqual(
  [0, 1, 2, 3].map(seat => rules.playerColorsForSeats(4, seat)),
  [["red"], ["yellow"], ["green"], ["blue"]]
);

console.log("Ludo rules regression checks passed.");
