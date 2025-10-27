import React, { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { View, Text, FlatList, TextInput, Button, TouchableOpacity, StyleSheet, ScrollView, Image, Modal } from "react-native";
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

  const allMessages = useMemo(() => {
    const latest = messages ?? [];
    const older = olderPage ?? [];
    if (!older.length) return latest;
    const map = new Map<string, typeof latest[number]>();
    for (const m of [...older, ...latest]) map.set(m._id, m);
    return Array.from(map.values()).sort((a, b) => a.createdAt - b.createdAt);
  }, [messages, olderPage]);

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
            keyExtractor={(m) => m._id}
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
                    {item.kind === "image" && item.imageUrl ? (
                      <Image
                        source={{ uri: item.imageUrl }}
                        style={{ width: 200, height: 200, borderRadius: 8 }}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={[
                        styles.messageText,
                        isCurrentUser ? styles.currentUserText : styles.otherUserText
                      ]}>
                        {item.text}
                      </Text>
                    )}
                  </View>
                  <Text style={[
                    styles.timestamp,
                    isCurrentUser ? styles.currentUserTimestamp : styles.otherUserTimestamp
                  ]}>
                    {new Date(item.createdAt).toLocaleTimeString()}
                  </Text>
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
            const serverId = await send({ roomId: roomId as Id<"rooms">, kind: "text", text: messageText });
            void serverId;
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
                  try {
                    await send({ 
                      roomId: roomId as Id<"rooms">, 
                      kind: "image", 
                      imageUrl: imageUrl.trim() 
                    });
                    setShowImageModal(false);
                    setImageUrl("");
                  } catch (e) {
                    console.error("Failed to send image", e);
                  }
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
