import type { JevHistory, JevRequestRecord } from "./types.js";

export function createHistory(): JevHistory & { record(value: JevRequestRecord): void } {
  const records: JevRequestRecord[] = [];
  return {
    get requests() {
      return records;
    },
    get lastRequest() {
      return records.at(-1);
    },
    clear() {
      records.length = 0;
    },
    record(value) {
      records.push(value);
    },
  };
}
