import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/context/auth-context";
import { Colors } from "@/constants/Colors";
import { router } from "expo-router";
import { deleteUser } from "firebase/auth";

export default function SettingsScreen() {
  const { user, signOut } = useAuth();

  const confirmDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This action is irreversible. Are you sure you want to delete your account?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: handleDeleteAccount,
        },
      ]
    );
  };

  const handleDeleteAccount = async () => {
    try {
      if (user) {
        await deleteUser(user);
        await signOut();
      }
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to delete account.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      router.replace("/(auth)/login");
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to log out.");
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Settings</Text>

        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => router.push("/edit-profile")}>
          <Feather name="user" size={20} color={Colors.text} />
          <Text style={styles.settingText}>Edit Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => router.push("/(auth)/change-password")}>
          <Feather name="lock" size={20} color={Colors.text} />
          <Text style={styles.settingText}>Change Password</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <Feather name="bell" size={20} color={Colors.text} />
          <Text style={styles.settingText}>Notifications</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <Feather name="shield" size={20} color={Colors.text} />
          <Text style={styles.settingText}>Privacy</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingItem}
          onPress={confirmDeleteAccount}>
          <Feather name="trash-2" size={20} color={Colors.error} />
          <Text style={[styles.settingText, { color: Colors.error }]}>
            Delete Account
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Feather name="log-out" size={20} color="#fff" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
  },
  heading: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 24,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  settingText: {
    marginLeft: 16,
    fontSize: 16,
    color: Colors.text,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 40,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
  },
  logoutText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 8,
    fontSize: 16,
  },
});
