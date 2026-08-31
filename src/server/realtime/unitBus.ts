import { EventEmitter } from "node:events";

const bus = new EventEmitter();
bus.setMaxListeners(200);

export function publishUnitRevision(layoutId: string, revision: number) {
  bus.emit(`unit:${layoutId}`, { layoutId, revision, at: Date.now() });
}

export function subscribeUnitRevision(
  layoutId: string,
  handler: (payload: { layoutId: string; revision: number; at: number }) => void,
) {
  const channel = `unit:${layoutId}`;
  bus.on(channel, handler);
  return () => bus.off(channel, handler);
}
