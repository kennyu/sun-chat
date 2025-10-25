import { View, Text, FlatList, TouchableOpacity, TextInput, Button } from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "expo-router";
import { useState } from "react";

export default function Chats() {
  const router = useRouter();
  const rooms = useQuery(api.rooms.listForCurrentUser, {});
  const createRoom = useMutation(api.rooms.create);
  const [roomName, setRoomName] = useState("");

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "600", marginBottom: 12 }}>Chats</Text>

      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
        <TextInput
          placeholder="New room name"
          value={roomName}
          onChangeText={setRoomName}
          style={{ flex: 1, borderWidth: 1, borderRadius: 8, padding: 10 }}
        />
        <Button
          title="Create"
          onPress={async () => {
            if (!roomName.trim()) return;
            try {
              const id = await createRoom({ name: roomName.trim(), memberUserIds: [] });
              setRoomName("");
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


