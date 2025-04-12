import { Stack } from "expo-router";
import { AuthProvider } from "../context/auth-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { initializeApp, getApps, getApp } from "firebase/app";

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBzA_sfVkI8gNfTw3Sa_aFRz-dPdV_NuR4",
  authDomain: "serviceapp-15851.firebaseapp.com",
  projectId: "serviceapp-15851",
  storageBucket: "serviceapp-15851.firebasestorage.app",
  messagingSenderId: "903548183333",
  appId: "1:903548183333:web:7711beb52315d39b6930cc",
  measurementId: "G-CGLJ3MF01Q",
};
if (getApps().length === 0) {
  initializeApp(firebaseConfig);
} else {
  getApp();
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <Stack>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="service/[id]"
              options={{
                title: "Service Details",
                headerBackTitle: "Back",
              }}
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
  );
}
