/**
 * state.js
 * ユーザーごとの確認待ち状態管理（GAS版 Storage.gs の PendingRecurringEvent 相当）
 *
 * GAS版はCacheService.getUserCache()でユーザーごとに300秒（5分）保持していたが、
 * Node.js版はプロセス常駐を前提としたメモリ内Mapで代替する（家計簿bot state.jsと同じ設計）。
 * 繰り返し予定登録・絵文字追加など、種類ごとに独立したMapを持つ。
 */

const TTL_MS = 5 * 60 * 1000;

function createPendingStore() {
  const store = new Map();

  return {
    set(userId, value) {
      store.set(userId, { value, expiresAt: Date.now() + TTL_MS });
    },
    get(userId) {
      const entry = store.get(userId);
      if (!entry || entry.expiresAt < Date.now()) return null;
      return entry.value;
    },
    clear(userId) {
      store.delete(userId);
    },
  };
}

module.exports = {
  PendingRecurringEvent: createPendingStore(),
  PendingIconAdd: createPendingStore(),
};
