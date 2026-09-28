type Listener = () => void;

const listeners = new Set<Listener>();

/** Tiny emitter so the record screen can refresh as soon as points land. */
export function onPoints(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitPoints(): void {
  listeners.forEach((l) => l());
}
