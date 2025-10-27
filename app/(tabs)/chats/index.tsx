import React, { useState, useMemo } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, Button, ScrollView, Image, Modal, StyleSheet } from "react-native";
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
  const updateProfile = useMutation(api.users.updateProfile);
  const [roomName, setRoomName] = useState("");
  const [memberIds, setMemberIds] = useState("");
  const users = useQuery(api.users.listAll, {});
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newAvatarUrl, setNewAvatarUrl] = useState("");

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
      {/* Header with profile and Sign Out */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <TouchableOpacity
          onPress={() => {
            setNewDisplayName(me?.displayName ?? "");
            setNewAvatarUrl(me?.avatarUrl ?? "");
            setShowProfileModal(true);
          }}
          style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
        >
          {me?.avatarUrl ? (
            <Image
              source={{ uri: me.avatarUrl }}
              style={{ width: 48, height: 48, borderRadius: 24, marginRight: 12, backgroundColor: "#eee" }}
            />
          ) : (
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                marginRight: 12,
                backgroundColor: "#e5e7eb",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontWeight: "700", fontSize: 20, color: "#374151" }}>
                {(me?.displayName ?? "U").slice(0, 1).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: "700", color: "#333" }}>
              {me?.displayName ?? ""}
            </Text>
            <Text style={{ fontSize: 12, color: "#666" }}>Tap to edit profile</Text>
          </View>
        </TouchableOpacity>
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

      {/* Profile Edit Modal */}
      <Modal
        visible={showProfileModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Display Name</Text>
              <TextInput
                value={newDisplayName}
                onChangeText={setNewDisplayName}
                style={styles.input}
                placeholder="Your name"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Avatar URL</Text>
              <TextInput
                value={newAvatarUrl}
                onChangeText={setNewAvatarUrl}
                style={styles.input}
                placeholder="https://example.com/avatar.jpg"
                autoCapitalize="none"
              />
            </View>

            {newAvatarUrl && (
              <View style={styles.avatarPreview}>
                <Text style={styles.label}>Preview</Text>
                <Image
                  source={{ uri: newAvatarUrl }}
                  style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "#eee" }}
                />
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setShowProfileModal(false)}
                style={[styles.modalButton, styles.cancelButton]}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  try {
                    await updateProfile({
                      displayName: newDisplayName.trim() || undefined,
                      avatarUrl: newAvatarUrl.trim() || undefined,
                    });
                    setShowProfileModal(false);
                  } catch (e) {
                    console.error("Failed to update profile", e);
                  }
                }}
                style={[styles.modalButton, styles.saveButton]}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
                onPress={() => toggleSelect(u!._id)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 20,
                  borderWidth: 2,
                  borderColor: selected[u!._id] ? "#007aff" : "#ddd",
                  marginRight: 10,
                  backgroundColor: selected[u!._id] ? "#e6f0ff" : "#fafafa",
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
                <Text style={{ fontWeight: selected[u!._id] ? "600" : "500", fontSize: 13, color: selected[u!._id] ? "#007aff" : "#333" }}>
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
          renderItem={({ item }) => {
            const members = (item as any)?.members || [];
            return (
              <TouchableOpacity
                onPress={() => item && router.push(`/chat/${item._id}`)}
                style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: "#eee" }}
              >
                <Text style={{ fontSize: 16, fontWeight: "500" }}>{item?.name}</Text>
                <Text style={{ color: "#666", fontSize: 12, marginTop: 2 }}>
                  {item?.isGroup ? "Group" : "Direct"} • {members.length} member{members.length !== 1 ? "s" : ""}
                </Text>
                {members.length > 0 && (
                  <View style={{ flexDirection: "row", marginTop: 6, flexWrap: "wrap" }}>
                    {members.slice(0, 5).map((member: any, idx: number) => (
                      <View
                        key={member._id}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginRight: 12,
                          marginBottom: 4,
                        }}
                      >
                        {member.avatarUrl ? (
                          <Image
                            source={{ uri: member.avatarUrl }}
                            style={{ width: 20, height: 20, borderRadius: 10, marginRight: 4 }}
                          />
                        ) : (
                          <View
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 10,
                              backgroundColor: "#e5e7eb",
                              alignItems: "center",
                              justifyContent: "center",
                              marginRight: 4,
                            }}
                          >
                            <Text style={{ fontSize: 10, fontWeight: "600", color: "#374151" }}>
                              {member.displayName?.slice(0, 1).toUpperCase()}
                            </Text>
                          </View>
                        )}
                        <Text style={{ fontSize: 12, color: "#666" }}>
                          {member.displayName}
                        </Text>
                      </View>
                    ))}
                    {members.length > 5 && (
                      <Text style={{ fontSize: 12, color: "#999" }}>+{members.length - 5} more</Text>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  avatarPreview: {
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


