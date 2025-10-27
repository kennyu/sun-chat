import { useEffect, useRef } from "react";
import { offlineStorage } from "../lib/offlineStorage";
import { api } from "../convex/_generated/api";
import { useMutation } from "convex/react";

/**
 * Minimal sync hook: drains the outbox once per mount and whenever a caller
 * explicitly triggers it through the returned `triggerDrain` ref.
 * We avoid NetInfo to keep deps light; callers can call `trigger()` after reconnect.
 */
export function useOfflineSync() {
  const send = useMutation(api.messages.send);
  const drainingRef = useRef(false);

  async function drainOnce() {
    if (drainingRef.current) return;
    drainingRef.current = true;
    try {
      const outbox = await offlineStorage.getOutbox();
      for (const item of outbox) {
        const signature = `${item.senderId}|${item.createdAt}|${item.text ?? ""}|${item.imageUrl ?? ""}`;
        try {
          await send({ roomId: item.roomId as any, kind: item.kind, text: item.text, imageUrl: item.imageUrl });
          await offlineStorage.removeFromOutboxBySignature(signature);
          await offlineStorage.prunePendingFromRoomBySignature(item.roomId, signature);
        } catch {
          await offlineStorage.markFailedInOutbox(item.tempId);
        }
      }
    } finally {
      drainingRef.current = false;
    }
  }

  useEffect(() => {
    void drainOnce();
  }, []);

  return { triggerDrain: drainOnce };
}


