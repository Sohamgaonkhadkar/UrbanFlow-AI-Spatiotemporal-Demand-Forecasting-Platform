import { useSyncExternalStore } from "react";
/** Tiny module store so every page can report the inference-link state once. */
type LinkState = { error: string | null; loading: boolean };
const initialState: LinkState = { error: null, loading: false };
let currentState = initialState;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
export function setLinkState(e: string | null, l = false) {
  if (currentState.error === e && currentState.loading === l) return;
  currentState = { error: e, loading: l };
  emit();
}
const subscribe = (f: () => void) => {
  subs.add(f);
  return () => void subs.delete(f);
};
// React requires the same snapshot object until the store actually changes.
const snapshot = () => currentState;
const serverSnapshot = () => initialState;
export function useLink() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
