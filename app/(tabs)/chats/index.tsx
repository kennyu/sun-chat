import React, { useState } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, Button, ScrollView } from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "expo-router";

export default function Chats() {
  const router = useRouter();
  const rooms = useQuery(api.rooms.listForCurrentUser, {});
  const createRoom = useMutation(api.rooms.create);
  const [roomName, setRoomName] = useState("");
  const [memberIds, setMemberIds] = useState("");
  const users = useQuery(api.users.listAll, {});
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const toggleSelect = (uid: string) => {
    setSelected((prev) => ({ ...prev, [uid]: !prev[uid] }));
    const ids = Object.entries({ ...selected, [uid]: !selected[uid] })
      .filter(([_, v]) => v)
      .map(([k]) => k);
    setMemberIds(ids.join(","));
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "600", marginBottom: 12 }}>Chats</Text>

      <View style={{ gap: 8, marginBottom: 12 }}>
        <TextInput
          placeholder="New room name"
          value={roomName}
          onChangeText={setRoomName}
          style={{ borderWidth: 1, borderRadius: 8, padding: 10 }}
        />
        {users && users.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
            {users.map((u) => (
              <TouchableOpacity
                key={u!._id}
                onPress={() => toggleSelect(u!.userId)}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: selected[u!.userId] ? "#007aff" : "#ddd",
                  marginRight: 8,
                  backgroundColor: selected[u!.userId] ? "#e6f0ff" : "#fafafa",
                }}
              >
                <Text style={{ fontWeight: "500" }}>{u?.displayName ?? "User"}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        <TextInput
          placeholder="Member Clerk IDs (comma separated)"
          value={memberIds}
          onChangeText={setMemberIds}
          style={{ borderWidth: 1, borderRadius: 8, padding: 10 }}
        />
        <Button
          title="Create"
          onPress={async () => {
            const name = roomName.trim();
            if (!name) return;
            const ids = memberIds
              .split(",")
              .map((s) => s.trim())
              .filter((s) => s.length > 0);
            try {
              const id = await createRoom({ name, memberUserIds: ids });
              setRoomName("");
              setMemberIds("");
              router.push(`/chat/${id}`);
            } catch (e) {
              // no-op
            }
          }}
        />
      </View>

      {rooms === undefined ? (
        <Text>Loading…</Text>
      ) : rooms.length === 0 ? (
        <Text>No rooms yet</Text>
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(item) => item!._id}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => item && router.push(`/chat/${item._id}`)}
              style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: "#eee" }}
            >
              <Text style={{ fontSize: 16, fontWeight: "500" }}>{item?.name}</Text>
              <Text style={{ color: "#666" }}>{item?.isGroup ? "Group" : "Direct"}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}


