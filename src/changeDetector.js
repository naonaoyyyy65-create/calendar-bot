/**
 * changeDetector.js
 * カレンダー変更検知（GAS版 Services.gs の ChangeDetector + EventHandlers.gs の EventSnapshot の移植）
 *
 * GAS版はCalendarEventオブジェクトのメソッド（event.getId()等）を扱っていたが、
 * Node.js版はcalendarService.normalizeEvent()で正規化したプレーンオブジェクトを扱う。
 * 純粋関数のみで構成し、store.js（永続化I/O）とは分離してテストしやすくしている。
 */

function createSnapshotEntry(event) {
  return {
    title: event.title,
    start: event.start.toISOString(),
    end: event.end.toISOString(),
    isAllDay: event.isAllDay,
    colorId: event.colorId,
  };
}

function createSnapshot(events) {
  const snapshot = {};
  events.forEach((event) => {
    snapshot[event.id] = createSnapshotEntry(event);
  });
  return snapshot;
}

function isModified(oldData, newData) {
  return (
    oldData.title !== newData.title ||
    oldData.start !== newData.start ||
    oldData.end !== newData.end ||
    oldData.colorId !== newData.colorId
  );
}

/**
 * 新規追加イベントを検出。lastSnapshotに無く、かつ作成日時がlastCheck以降のもの
 * （lastCheck以前から存在するがスナップショット未取得だったイベントを「新規」と誤検知しないため）
 */
function detectAdded(currentEvents, lastSnapshot, lastCheck) {
  return currentEvents.filter((event) => !lastSnapshot[event.id] && event.created && event.created > lastCheck);
}

function detectModified(currentEvents, lastSnapshot, currentSnapshot) {
  const modified = [];
  currentEvents.forEach((event) => {
    const last = lastSnapshot[event.id];
    const current = currentSnapshot[event.id];
    if (last && isModified(last, current)) {
      modified.push({ event, old: last, new: current });
    }
  });
  return modified;
}

/**
 * 削除イベントを検出。checkStart以降に開始予定だった（=まだ起きていなかった）ものだけを対象とし、
 * 過去に終わったイベントがチェック範囲外に出て消えただけのケースを「削除」と誤検知しないようにする
 */
function detectDeleted(lastSnapshot, currentSnapshot, checkStart) {
  const deleted = [];
  Object.keys(lastSnapshot).forEach((id) => {
    if (!currentSnapshot[id]) {
      const lastEvent = lastSnapshot[id];
      const eventStartTime = new Date(lastEvent.start);
      if (eventStartTime >= checkStart) {
        deleted.push({ id, data: lastEvent });
      }
    }
  });
  return deleted;
}

function detectAll(lastSnapshot, currentSnapshot, currentEvents, lastCheck, checkStart) {
  return {
    added: detectAdded(currentEvents, lastSnapshot, lastCheck),
    modified: detectModified(currentEvents, lastSnapshot, currentSnapshot),
    deleted: detectDeleted(lastSnapshot, currentSnapshot, checkStart),
  };
}

module.exports = {
  createSnapshotEntry,
  createSnapshot,
  isModified,
  detectAdded,
  detectModified,
  detectDeleted,
  detectAll,
};
