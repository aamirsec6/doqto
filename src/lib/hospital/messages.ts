import type { IntercomMessage } from "./messageTypes";
import {
  MESSAGES_STORAGE_KEY,
  MESSAGES_UPDATED_EVENT,
} from "./messageTypes";

const MAX_MESSAGES = 500;

export function loadMessages(): IntercomMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(MESSAGES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as IntercomMessage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveMessages(messages: IntercomMessage[]) {
  if (typeof window === "undefined") return;
  const trimmed = messages.slice(0, MAX_MESSAGES);
  window.localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(trimmed));
  window.dispatchEvent(new CustomEvent(MESSAGES_UPDATED_EVENT));
}

export function appendMessage(message: IntercomMessage): IntercomMessage[] {
  const next = [message, ...loadMessages()].slice(0, MAX_MESSAGES);
  saveMessages(next);
  return next;
}

export function appendMessages(batch: IntercomMessage[]): IntercomMessage[] {
  const existing = loadMessages();
  const ids = new Set(existing.map((m) => m.id));
  const fresh = batch.filter((m) => !ids.has(m.id));
  if (!fresh.length) return existing;
  const next = [...fresh, ...existing].slice(0, MAX_MESSAGES);
  saveMessages(next);
  return next;
}

export function createMessage(
  partial: Omit<IntercomMessage, "id" | "createdAt"> & {
    id?: string;
    createdAt?: string;
  },
): IntercomMessage {
  return {
    ...partial,
    id: partial.id ?? `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: partial.createdAt ?? new Date().toISOString(),
  };
}

export function messagesForChannel(
  messages: IntercomMessage[],
  channelId: string,
): IntercomMessage[] {
  return messages
    .filter((m) => m.channelId === channelId)
    .sort(
      (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
    );
}

export function messagesForStaffInbox(
  messages: IntercomMessage[],
  staffId: string,
  roleCategory: string,
  unitChannelId?: string,
): IntercomMessage[] {
  const broadcast = "ch-broadcast";
  const roleCh = `ch-role-${roleCategory}`;
  const staffCh = `ch-staff-${staffId}`;
  return messages
    .filter(
      (m) =>
        m.channelId === broadcast ||
        m.channelId === roleCh ||
        m.channelId === staffCh ||
        (unitChannelId && m.channelId === unitChannelId) ||
        m.targetStaffId === staffId ||
        m.channelKind === "incident",
    )
    .sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );
}

export function subscribeMessages(
  onChange: (messages: IntercomMessage[]) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const refresh = () => onChange(loadMessages());
  const onCustom = () => refresh();
  const onStorage = (e: StorageEvent) => {
    if (e.key === MESSAGES_STORAGE_KEY) refresh();
  };
  window.addEventListener(MESSAGES_UPDATED_EVENT, onCustom);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(MESSAGES_UPDATED_EVENT, onCustom);
    window.removeEventListener("storage", onStorage);
  };
}
