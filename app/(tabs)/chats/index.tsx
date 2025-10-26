import React, { useState, useMemo } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, Button, ScrollView, Image } from "react-native";
import { Authenticated, Unauthenticated, useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Redirect, useRouter } from "expo-router";
import { useAuthActions } from "@convex-dev/auth/react";

function ChatsContent() {
  const router = useRouter();
  const { signOut } = useAuthActions();
  const me = useQuery(api.users.current, {});
  const rooms = useQuery(api.rooms.listForCurrentUser, {});
  const createRoom = useMutation(api.rooms.create);
  const [roomName, setRoomName] = useState("");
  const [memberIds, setMemberIds] = useState("");
  const users = useQuery(api.users.listAll, {});
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  // Filter out current user from the members list
  const otherUsers = useMemo(() => {
    if (!users || !me?.userId) return [];
    return users.filter((u) => u.userId !== me.userId);
  }, [users, me?.userId]);

  // console.log("users", users);
  // console.log("me", me);
  // console.log("other users", otherUsers);

  const toggleSelect = (uid: string) => {
    setSelected((prev) => ({ ...prev, [uid]: !prev[uid] }));
    const ids = Object.entries({ ...selected, [uid]: !selected[uid] })
      .filter(([_, v]) => v)
      .map(([k]) => k);
    setMemberIds(ids.join(","));
  };

  const displayRooms = rooms ?? [];

  return (
    <View style={{ flex: 1, padding: 16 }}>
      {/* Header with Sign Out */}
      <View style={{ flexDirection: "row", justifyContent: "flex-end", alignItems: "center", marginBottom: 16 }}>
        <TouchableOpacity
          onPress={async () => {
            await signOut();
            router.replace("/");
          }}
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
          <ScrollView horizontal={true} showsHorizontalScrollIndicator={false}>
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
                  alignItems: "center",
                }}
              >
                {u?.avatarUrl ? (
                  <Image
                    source={{ uri: u.avatarUrl }}
                    style={{ width: 48, height: 48, borderRadius: 24, marginBottom: 6, backgroundColor: "#eee" }}
                  />
                ) : (
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      marginBottom: 6,
                      backgroundColor: "#e5e7eb",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontWeight: "700", color: "#374151" }}>
                      {(u?.displayName ?? "U").slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text style={{ fontWeight: selected[u!.userId] ? "600" : "500", fontSize: 13, color: selected[u!.userId] ? "#007aff" : "#333" }}>
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
              // If offline, room creation isn't implemented for outbox in this minimal pass
            }
          }}
        />
      </View>

      {rooms === undefined && displayRooms.length === 0 ? (
        <Text>Loading…</Text>
      ) : displayRooms.length === 0 ? (
        <Text>No rooms yet</Text>
      ) : (
        <FlatList
          data={displayRooms}
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

export default function Chats() {
  return (
    <>
      <Authenticated>
        <ChatsContent />
      </Authenticated>
      <Unauthenticated>
        <Redirect href="/" />
      </Unauthenticated>
    </>
  );
}


