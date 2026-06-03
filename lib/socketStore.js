/**
 * Shared in-memory socket/presence state.
 *
 * Kept in its own module (rather than on app.js) so both the Socket.IO layer
 * and the helper utilities can import it without a circular dependency.
 *
 * NOTE: this is per-instance state. Running more than one server process
 * requires a shared store (e.g. the Socket.IO Redis adapter) instead.
 */

// Maps userId -> active socket id.
export const userSocketIDs = new Map();

// Set of userIds currently marked online.
export const onlineUsers = new Set();
