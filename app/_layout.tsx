import { Stack } from "expo-router";
import { AuthProvider } from "../context/auth-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { initializeApp, getApps, getApp } from "firebase/app";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { useFrameworkReady } from "@/hooks/userFrameworkReady";

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCUnwFzkqNrk8Ai9Z8lCRcv4sAw-uhg7Mk",
  authDomain: "ecomerce-site-d6b4a.firebaseapp.com",
  projectId: "ecomerce-site-d6b4a",
  storageBucket: "ecomerce-site-d6b4a.appspot.com",
  messagingSenderId: "540630851940",
  appId: "1:540630851940:web:e1e6464f5d0ee223531a71",
  measurementId: "G-CKJE99D9PB",
};

if (getApps().length === 0) {
  initializeApp(firebaseConfig);
} else {
  getApp();
}

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function RootLayout() {
  useFrameworkReady();
  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  const registerForPushNotificationsAsync = async () => {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Failed to get push token for push notification!");
      return;
    }

    const token = await Notifications.getExpoPushTokenAsync();
    console.log(token);
  };

  return (
    <>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar />
          <AuthProvider>
            <Stack>
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="service/[id]"
                options={({ route }) => ({
                  title: route.params?.name || "Service Details",
                  headerBackTitle: "Back",
                })}
              />
              <Stack.Screen
                name="chat/[id]"
                options={({ route }) => ({
                  title: route.params?.name || "Chat",
                  headerBackTitle: "Back",
                })}
              />
              <Stack.Screen
                name="create-service"
                options={{
                  title: "Add New Service",
                  headerBackTitle: "Back",
                }}
              />
              <Stack.Screen
                name="edit-profile"
                options={{
                  title: "Edit Profile",
                  headerBackTitle: "Back",
                }}
              />
              <Stack.Screen
                name="debug-image-picker"
                options={{
                  title: "Debug Image Picker",
                  headerBackTitle: "Back",
                }}
              />
            </Stack>
            <Toast />
          </AuthProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </>
  );
}
