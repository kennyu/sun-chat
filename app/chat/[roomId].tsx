import React, { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { View, Text, FlatList, TextInput, Button, TouchableOpacity, StyleSheet } from "react-native";
import type { Id } from "../../convex/_generated/dataModel";
import { useLocalStore } from "../localStore";

export default function Room() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const me = useQuery(api.users.current, {});
  const [text, setText] = useState("");
  const messages = useQuery(api.messages.listByRoom, roomId ? { roomId: roomId as Id<"rooms"> } : "skip");
  const send = useMutation(api.messages.send);
  const { saveMessagesFromServer, useLocalMessages, sendMessage, drainOutbox } = useLocalStore();
  const localMessages = useLocalMessages(roomId as string | undefined);
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

  useEffect(() => {
    if (!roomId) return;
    const merged = [ ...(olderPage ?? []), ...(messages ?? []) ];
    if (merged.length) {
      saveMessagesFromServer(roomId as string, merged as any).catch(() => {});
    }
  }, [messages, olderPage, roomId, saveMessagesFromServer]);

  const allMessages = useMemo(() => {
    const fromServer = (() => {
      const latest = messages ?? [];
      const older = olderPage ?? [];
      if (!older.length) return latest;
      const map = new Map<string, typeof latest[number]>();
      for (const m of [...older, ...latest]) map.set(m._id, m);
      return Array.from(map.values()).sort((a, b) => a.createdAt - b.createdAt);
    })();
    if (fromServer.length > 0) return fromServer as any;
    return localMessages as any;
  }, [messages, olderPage, localMessages]);

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
    const user = allUsers?.find((u) => u.userId === senderId);
    return user?.displayName ?? "Unknown";
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
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
              const isCurrentUser = item.senderId === me?.userId;
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
                    <Text style={[
                      styles.messageText,
                      isCurrentUser ? styles.currentUserText : styles.otherUserText
                    ]}>
                      {item.text}
                    </Text>
                  </View>
                  {item.pending && (
                    <Text style={[styles.timestamp, { fontStyle: "italic" }]}>Pending…</Text>
                  )}
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

      <View style={{ flexDirection: "row", gap: 8 }}>
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
            // Always create optimistic local pending message
            const localId = await sendMessage({ roomId: roomId as string, kind: "text", text: text.trim() });
            setText("");
            try {
              const serverId = await send({ roomId: roomId as Id<"rooms">, kind: "text", text: text.trim() });
              // best-effort: mark delivered by replacing the localId with serverId
              // local store will remove from outbox as well
              // Note: we don't import markMessageDelivered directly here; the drain will also reconcile.
            } catch {
              // offline: outbox already contains this send; UI shows pending
            } finally {
              // attempt to drain in case we're online now
              drainOutbox().catch(() => {});
            }
          }}
        />
      </View>
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
});
