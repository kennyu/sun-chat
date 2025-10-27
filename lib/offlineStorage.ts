import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AnyCachedMessage, CachedRoom, CachedUser, PendingMessage, ServerMessage } from "../types/offline";

const ROOMS_KEY = "offline:rooms";
const USERS_KEY = "offline:users";
const MESSAGES_KEY = (roomId: string) => `offline:messages:${roomId}`;
const OUTBOX_KEY = "offline:outbox";

const MAX_MESSAGES_PER_ROOM = 200;

async function safeGet<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function safeSet<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export const offlineStorage = {
  // Rooms
  getRooms: () => safeGet<CachedRoom[]>(ROOMS_KEY, []),
  setRooms: (rooms: CachedRoom[]) => safeSet(ROOMS_KEY, rooms),

  // Users
  getUsers: () => safeGet<CachedUser[]>(USERS_KEY, []),
  setUsers: (users: CachedUser[]) => safeSet(USERS_KEY, users),

  // Messages per room
  getRoomMessages: (roomId: string) => safeGet<AnyCachedMessage[]>(MESSAGES_KEY(roomId), []),
  setRoomMessages: async (roomId: string, messages: AnyCachedMessage[]) => {
    const trimmed = messages
      .sort((a, b) => a.createdAt - b.createdAt)
      .slice(-MAX_MESSAGES_PER_ROOM);
    await safeSet(MESSAGES_KEY(roomId), trimmed);
  },
  appendRoomMessages: async (roomId: string, msgs: AnyCachedMessage[]) => {
    const existing = await offlineStorage.getRoomMessages(roomId);
    const merged = [...existing, ...msgs];
    await offlineStorage.setRoomMessages(roomId, merged);
  },

  // Outbox
  getOutbox: () => safeGet<PendingMessage[]>(OUTBOX_KEY, []),
  setOutbox: (items: PendingMessage[]) => safeSet(OUTBOX_KEY, items),
  enqueueOutbox: async (item: PendingMessage) => {
    const items = await offlineStorage.getOutbox();
    items.push(item);
    await offlineStorage.setOutbox(items);
  },
  removeFromOutboxBySignature: async (signature: string) => {
    const items = await offlineStorage.getOutbox();
    const filtered = items.filter((it) => `${it.senderId}|${it.createdAt}|${it.text ?? ""}|${it.imageUrl ?? ""}` !== signature);
    await offlineStorage.setOutbox(filtered);
  },
  markFailedInOutbox: async (tempId: string) => {
    const items = await offlineStorage.getOutbox();
    const updated = items.map((it) => (it.tempId === tempId ? { ...it, status: "failed" as const } : it));
    await offlineStorage.setOutbox(updated);
  },

  // Helpers
  prunePendingFromRoomBySignature: async (roomId: string, signature: string) => {
    const existing = await offlineStorage.getRoomMessages(roomId);
    const filtered = existing.filter((m) => {
      if ((m as any).tempId) {
        const sig = `${(m as any).senderId}|${m.createdAt}|${(m as any).text ?? ""}|${(m as any).imageUrl ?? ""}`;
        return sig !== signature;
      }
      return true;
    });
    await offlineStorage.setRoomMessages(roomId, filtered);
  },
};

export type { AnyCachedMessage, CachedRoom, CachedUser, PendingMessage, ServerMessage };


