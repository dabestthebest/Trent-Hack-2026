// While housemates pass the phone around for Dibs, the Runway (your balance and bills) is locked so
// nobody can peek. Kept in memory only: it is switched off when Dibs is ended or restarted, and a
// reload clears it (a reload also clears the money numbers, which are never saved).

import { useSyncExternalStore } from "react";

let locked = false;
const listeners = new Set<() => void>();

export function setDibsLock(next: boolean): void {
  if (locked === next) return;
  locked = next;
  for (const l of listeners) l();
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useDibsLock(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => locked,
    () => false,
  );
}
