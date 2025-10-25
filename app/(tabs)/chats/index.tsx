import React, { useState, useMemo } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, Button, ScrollView } from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "expo-router";
import { useAuth, useClerk } from "@clerk/clerk-expo";

export default function Chats() {
  const router = useRouter();
  const { userId } = useAuth();
  const { signOut } = useClerk();
  const rooms = useQuery(api.rooms.listForCurrentUser, {});
  const createRoom = useMutation(api.rooms.create);
  const [roomName, setRoomName] = useState("");
  const [memberIds, setMemberIds] = useState("");
  const users = useQuery(api.users.listAll, {});
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  // Filter out current user from the members list
  const otherUsers = useMemo(() => {
    if (!users || !userId) return [];
    return users.filter((u) => u.userId !== userId);
  }, [users, userId]);

  const toggleSelect = (uid: string) => {
    setSelected((prev) => ({ ...prev, [uid]: !prev[uid] }));
    const ids = Object.entries({ ...selected, [uid]: !selected[uid] })
      .filter(([_, v]) => v)
      .map(([k]) => k);
    setMemberIds(ids.join(","));
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      {/* Header with Sign Out */}
      <View style={{ flexDirection: "row", justifyContent: "flex-end", alignItems: "center", marginBottom: 16 }}>
        <TouchableOpacity
          onPress={() => signOut()}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            backgroundColor: "#ff3b30",
            borderRadius: 8,
          }}
        >
          <Text style={{ color: "#ffffff", fontWeight: "600", fontSize: 14 }}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Members Section */}
      {otherUsers.length > 0 && (
        <View style={{ 
          marginBottom: 16, 
          padding: 14, 
          backgroundColor: "#ffffff", 
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "#e0e0e0",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 2,
        }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#333", marginBottom: 10 }}>Members</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {otherUsers.map((u) => (
              <TouchableOpacity
                key={u!._id}
                onPress={() => toggleSelect(u!.userId)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 20,
                  borderWidth: 2,
                  borderColor: selected[u!.userId] ? "#007aff" : "#ddd",
                  marginRight: 10,
                  backgroundColor: selected[u!.userId] ? "#e6f0ff" : "#fafafa",
                }}
              >
                <Text style={{ fontWeight: selected[u!.userId] ? "600" : "500", fontSize: 15, color: selected[u!.userId] ? "#007aff" : "#333" }}>
                  {u?.displayName ?? "User"}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Create Room Section */}
      <View style={{ gap: 8, marginBottom: 12 }}>
        <TextInput
          placeholder="New room name"
          value={roomName}
          onChangeText={setRoomName}
          style={{ borderWidth: 1, borderRadius: 8, padding: 10 }}
        />
        <Button
          title="Create Room"
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
              setSelected({});
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


