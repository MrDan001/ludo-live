// EMPTY_ROOM_CLEANUP
// Purpose: make an abandoned multiplayer room cease to exist as soon as its last
// member disconnects. This is intentionally isolated from Ludo rules, betting,
// movement, readiness and match settlement.
//
// server.js keeps its room registry private inside the module. Because this file
// is preloaded before server.js, we attach a narrowly-scoped relationship between
// the server's room registry and each room's members Map. When the last member is
// removed, the parent room registry entry is removed immediately. That means the
// room disappears from public room discovery and cannot be joined by code.

const roomParents = new WeakMap();
const originalSet = Map.prototype.set;
const originalDelete = Map.prototype.delete;

Map.prototype.set = function patchedSet(key, value) {
  // Only recognize the actual multiplayer room shape from server.js.
  if (
    value &&
    value.members instanceof Map &&
    value.code &&
    value.hostId !== undefined &&
    value.roomSize !== undefined
  ) {
    roomParents.set(value.members, {
      parent: this,
      code: String(value.code).trim().toUpperCase(),
      room: value,
    });
  }
  return originalSet.call(this, key, value);
};

Map.prototype.delete = function patchedDelete(key) {
  const result = originalDelete.call(this, key);
  const meta = roomParents.get(this);

  if (result && meta && this.size === 0) {
    const currentRoom = meta.parent.get(meta.code);
    if (currentRoom && currentRoom.members === this) {
      originalDelete.call(meta.parent, meta.code);
    }
    roomParents.delete(this);
  }

  return result;
};
