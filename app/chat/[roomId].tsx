import React, { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { View, Text, FlatList, TextInput, Button, TouchableOpacity } from "react-native";
import type { Id } from "../../convex/_generated/dataModel";

export default function Room() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const [text, setText] = useState("");
  const messages = useQuery(api.messages.listByRoom, roomId ? { roomId: roomId as Id<"rooms"> } : "skip");
  const send = useMutation(api.messages.send);
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
            renderItem={({ item }) => (
              <View style={{ paddingVertical: 8 }}>
                <Text style={{ color: "#888", fontSize: 12 }}>{new Date(item.createdAt).toLocaleTimeString()}</Text>
                <Text>{item.text}</Text>
              </View>
            )}
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
            await send({ roomId: roomId as Id<"rooms">, kind: "text", text: text.trim() });
            setText("");
          }}
        />
      </View>
    </View>
  );
}


