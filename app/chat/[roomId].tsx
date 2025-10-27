import React, { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { View, Text, FlatList, TextInput, Button, TouchableOpacity, StyleSheet, ScrollView, Image, Modal } from "react-native";
import { offlineStorage } from "../../lib/offlineStorage";
import { useOfflineSync } from "../../hooks/useOfflineSync";
import type { AnyCachedMessage, PendingMessage } from "../../types/offline";
import type { Id } from "../../convex/_generated/dataModel";

export default function Room() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const router = useRouter();
  const me = useQuery(api.users.current, {});
  const [text, setText] = useState("");
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const messages = useQuery(api.messages.listByRoom, roomId ? { roomId: roomId as Id<"rooms"> } : "skip");
  const send = useMutation(api.messages.send);
  const rooms = useQuery(api.rooms.listForCurrentUser, {});
  // One-shot older page using before-cursor
  const [olderBefore, setOlderBefore] = useState<number | undefined>(undefined);
  const olderPage = useQuery(
    api.messages.listByRoom,
    roomId && olderBefore !== undefined
      ? { roomId: roomId as Id<"rooms">, before: olderBefore, limit: 50 }
      : "skip"
  );

  // Presence
  const presence = useQuery(api.presence.listByRoom, roomId ? { roomId: roomId as Id<"rooms"> } : "skip");
  const setPresence = useMutation(api.presence.setPresence);
  const allUsers = useQuery(api.users.listAll, {});

  // Keep presence updated for this room
  useEffect(() => {
    if (!roomId) return;
    setPresence({ roomId: roomId as Id<"rooms">, online: true, typing: false }).catch(() => {});
    return () => {
      setPresence({ roomId: roomId as Id<"rooms">, online: false, typing: false }).catch(() => {});
    };
  }, [roomId, setPresence]);

  // Update typing presence when text changes
  useEffect(() => {
    if (!roomId) return;
    setPresence({ roomId: roomId as Id<"rooms">, online: true, typing: text.length > 0 }).catch(() => {});
  }, [text, roomId, setPresence]);

  const [cachedMessages, setCachedMessages] = useState<AnyCachedMessage[]>([]);

  // Drain outbox on mount
  const { triggerDrain } = useOfflineSync();

  // Load cached messages when room changes
  useEffect(() => {
    let active = true;
    async function load() {
      if (!roomId) return;
      const cached = await offlineStorage.getRoomMessages(String(roomId));
      if (active) setCachedMessages(cached);
    }
    void load();
    return () => {
      active = false;
    };
  }, [roomId]);

  // Persist server messages into cache and merge with pending
  useEffect(() => {
    async function persist() {
      if (!roomId) return;
      const server = [...(olderPage ?? []), ...(messages ?? [])];
      if (server.length > 0) {
        const dedup = new Map<string, AnyCachedMessage>();
        for (const m of server) {
          const sig = `${m.senderId}|${m.createdAt}|${m.text ?? ""}|${m.imageUrl ?? ""}`;
          dedup.set(sig, m as AnyCachedMessage);
        }
        for (const m of cachedMessages) {
          if ((m as any).tempId) {
            const sig = `${(m as any).senderId}|${m.createdAt}|${(m as any).text ?? ""}|${(m as any).imageUrl ?? ""}`;
            if (!dedup.has(sig)) dedup.set(sig, m);
          }
        }
        const merged = Array.from(dedup.values()).sort((a, b) => a.createdAt - b.createdAt);
        setCachedMessages(merged);
        await offlineStorage.setRoomMessages(String(roomId), merged);
      }
    }
    void persist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, olderPage, roomId]);

  const allMessages = useMemo(() => cachedMessages, [cachedMessages]);

  // Join presence with user info
  const usersInRoom = useMemo(() => {
    if (!presence || !allUsers) return [];
    const onlinePresence = presence.filter((p) => p.online);
    return onlinePresence.map((p) => {
      const user = allUsers.find((u) => u._id === p.userId);
      return {
        displayName: user?.displayName ?? "Unknown",
        typing: p.typing,
      };
    });
  }, [presence, allUsers]);

  // Get sender display name for a message
  const getSenderName = (senderId: string) => {
    const user = allUsers?.find((u) => u._id === senderId);
    return user?.displayName ?? "Unknown";
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      {/* Rooms switcher */}
      {rooms && rooms.length > 0 && (
        <View style={{ marginBottom: 12 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {rooms.map((r) => (
              <TouchableOpacity
                key={r!._id}
                onPress={() => router.push(`/chat/${r!._id}`)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 16,
                  borderWidth: 1,
                  marginRight: 8,
                  backgroundColor: String(r!._id) === String(roomId) ? "#e6f0ff" : "#f5f5f5",
                  borderColor: String(r!._id) === String(roomId) ? "#007aff" : "#ddd",
                }}
              >
                <Text style={{ fontWeight: "600", color: "#333" }}>{r?.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 8 }}>Room</Text>
      {usersInRoom.length > 0 && (
        <View style={{ marginBottom: 12, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: "#f5f5f5", borderRadius: 8 }}>
          <Text style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>In this room:</Text>
          {usersInRoom.map((user, index) => (
            <Text key={index} style={{ fontSize: 14, color: "#333", marginBottom: 2 }}>
              • {user.displayName}{user.typing ? " (typing...)" : ""}
            </Text>
          ))}
        </View>
      )}
      {messages === undefined ? (
        <Text>Loading…</Text>
      ) : (
        <>
          <View style={{ marginBottom: 8 }}>
            <TouchableOpacity
              onPress={() => {
                if (!messages || messages.length === 0) return;
                // load one older page using the oldest currently loaded message
                setOlderBefore(messages[0].createdAt);
              }}
              style={{ paddingVertical: 8 }}
            >
              <Text style={{ color: "#007aff" }}>Load older</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={allMessages}
            keyExtractor={(m: any) => m._id ?? m.tempId ?? `${m.senderId}|${m.createdAt}|${m.text ?? ""}|${m.imageUrl ?? ""}`}
            renderItem={({ item }) => {
              const isCurrentUser = item.senderId === me?._id;
              const senderName = getSenderName(item.senderId);
              
              return (
                <View style={[
                  styles.messageContainer,
                  isCurrentUser ? styles.currentUserContainer : styles.otherUserContainer
                ]}>
                  {!isCurrentUser && (
                    <Text style={styles.senderName}>{senderName}</Text>
                  )}
                  <View style={[
                    styles.messageBubble,
                    isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble
                  ]}>
                    {item.kind === "image" && (item as any).imageUrl ? (
                      <Image
                        source={{ uri: (item as any).imageUrl }}
                        style={{ width: 200, height: 200, borderRadius: 8 }}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={[
                        styles.messageText,
                        isCurrentUser ? styles.currentUserText : styles.otherUserText
                      ]}>
                        {(item as any).text}
                      </Text>
                    )}
                  </View>
                  <Text style={[
                    styles.timestamp,
                    isCurrentUser ? styles.currentUserTimestamp : styles.otherUserTimestamp
                  ]}>
                    {new Date(item.createdAt).toLocaleTimeString()}
                  </Text>
                  {isCurrentUser && (item as any).tempId && (
                    <Text style={{ fontSize: 11, color: (item as any).status === "failed" ? "#ef4444" : "#999" }}>
                      {(item as any).status === "failed" ? "Failed" : "Sending…"}
                    </Text>
                  )}
                </View>
              );
            }}
          />
        </>
      )}

      <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
        <TouchableOpacity
          onPress={() => setShowImageModal(true)}
          style={{
            padding: 10,
            backgroundColor: "#007aff",
            borderRadius: 8,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 20 }}>📷</Text>
        </TouchableOpacity>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Type a message"
          style={{ flex: 1, borderWidth: 1, borderRadius: 8, padding: 10 }}
        />
        <Button
          title="Send"
          onPress={async () => {
            if (!roomId || !text.trim()) return;
            const messageText = text.trim();
            setText("");

            const temp: PendingMessage = {
              tempId: `tmp_${Date.now()}_${Math.random().toString(36).slice(2)}`,
              roomId: String(roomId),
              senderId: String(me?._id ?? "me"),
              kind: "text",
              text: messageText,
              createdAt: Date.now(),
              status: "pending",
            };

            const next = [...cachedMessages, temp].sort((a, b) => a.createdAt - b.createdAt);
            setCachedMessages(next);
            await offlineStorage.setRoomMessages(String(roomId), next);
            await offlineStorage.enqueueOutbox(temp);

            try {
              await send({ roomId: roomId as Id<"rooms">, kind: "text", text: messageText });
              const sig = `${temp.senderId}|${temp.createdAt}|${temp.text ?? ""}|${temp.imageUrl ?? ""}`;
              await offlineStorage.removeFromOutboxBySignature(sig);
              await offlineStorage.prunePendingFromRoomBySignature(String(roomId), sig);
              const refreshed = await offlineStorage.getRoomMessages(String(roomId));
              setCachedMessages(refreshed);
            } catch {
              await offlineStorage.markFailedInOutbox(temp.tempId);
              const updated = (await offlineStorage.getRoomMessages(String(roomId))).map((m: any) =>
                m.tempId === temp.tempId ? { ...m, status: "failed" } : m
              );
              await offlineStorage.setRoomMessages(String(roomId), updated);
              setCachedMessages(updated);
            }
          }}
        />
      </View>

      {/* Image Upload Modal */}
      <Modal
        visible={showImageModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowImageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Send Image</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Image URL</Text>
              <TextInput
                value={imageUrl}
                onChangeText={setImageUrl}
                style={styles.input}
                placeholder="https://example.com/image.jpg"
                autoCapitalize="none"
              />
            </View>

            {imageUrl && (
              <View style={styles.imagePreview}>
                <Text style={styles.label}>Preview</Text>
                <Image
                  source={{ uri: imageUrl }}
                  style={{ width: 200, height: 200, borderRadius: 8, backgroundColor: "#eee" }}
                  resizeMode="cover"
                />
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => {
                  setShowImageModal(false);
                  setImageUrl("");
                }}
                style={[styles.modalButton, styles.cancelButton]}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  if (!roomId || !imageUrl.trim()) return;
                  const temp: PendingMessage = {
                    tempId: `tmp_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                    roomId: String(roomId),
                    senderId: String(me?._id ?? "me"),
                    kind: "image",
                    imageUrl: imageUrl.trim(),
                    createdAt: Date.now(),
                    status: "pending",
                  };
                  try {
                    const next = [...cachedMessages, temp].sort((a, b) => a.createdAt - b.createdAt);
                    setCachedMessages(next);
                    await offlineStorage.setRoomMessages(String(roomId), next);
                    await offlineStorage.enqueueOutbox(temp);

                    await send({ 
                      roomId: roomId as Id<"rooms">, 
                      kind: "image", 
                      imageUrl: imageUrl.trim() 
                    });
                    const sig = `${temp.senderId}|${temp.createdAt}|${temp.text ?? ""}|${temp.imageUrl ?? ""}`;
                    await offlineStorage.removeFromOutboxBySignature(sig);
                    await offlineStorage.prunePendingFromRoomBySignature(String(roomId), sig);
                    const refreshed = await offlineStorage.getRoomMessages(String(roomId));
                    setCachedMessages(refreshed);
                  } catch (e) {
                    console.error("Failed to send image", e);
                    // mark failed in cache for the temp message
                    await offlineStorage.markFailedInOutbox(temp.tempId);
                    const all = await offlineStorage.getRoomMessages(String(roomId));
                    const updated = all.map((m: any) => (m as any).tempId === temp.tempId ? { ...m, status: "failed" } : m);
                    await offlineStorage.setRoomMessages(String(roomId), updated);
                    setCachedMessages(updated);
                  }
                  setShowImageModal(false);
                  setImageUrl("");
                }}
                style={[styles.modalButton, styles.saveButton]}
              >
                <Text style={styles.saveButtonText}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  messageContainer: {
    marginVertical: 4,
    paddingHorizontal: 8,
  },
  currentUserContainer: {
    alignItems: "flex-end",
  },
  otherUserContainer: {
    alignItems: "flex-start",
  },
  senderName: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
    marginLeft: 8,
    fontWeight: "500",
  },
  messageBubble: {
    maxWidth: "75%",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginBottom: 2,
  },
  currentUserBubble: {
    backgroundColor: "#007aff",
    borderBottomRightRadius: 4,
  },
  otherUserBubble: {
    backgroundColor: "#e5e5ea",
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
  },
  currentUserText: {
    color: "#ffffff",
  },
  otherUserText: {
    color: "#000000",
  },
  timestamp: {
    fontSize: 11,
    color: "#999",
    marginHorizontal: 8,
  },
  currentUserTimestamp: {
    textAlign: "right",
  },
  otherUserTimestamp: {
    textAlign: "left",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#333",
  },
  imagePreview: {
    marginBottom: 16,
    alignItems: "center",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f5f5f5",
  },
  cancelButtonText: {
    color: "#666",
    fontWeight: "600",
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: "#007aff",
  },
  saveButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 16,
  },
});
