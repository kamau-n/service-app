"use client";

import { useAuth } from "@/context/auth-context";
import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";

export default function Index() {
  const { user, loading } = useAuth();
  console.log(user, loading);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return user ? <Redirect href="/(tabs)" /> : <Redirect href="/(auth)/login" />;
}
