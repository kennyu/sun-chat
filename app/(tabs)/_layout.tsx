import React from "react";
import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="chats/index" options={{ title: "Chats" }} />
    </Tabs>
  );
}


