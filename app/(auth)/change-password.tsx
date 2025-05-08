import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import {
  getAuth,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import Toast from "react-native-toast-message";

export default function ChangePasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      return Toast.show({
        type: "error",
        text1: "Missing Fields",
        text2: "Please fill in all fields.",
      });
    }

    if (newPassword !== confirmPassword) {
      return Toast.show({
        type: "error",
        text1: "Password Mismatch",
        text2: "New passwords do not match.",
      });
    }

    if (newPassword.length < 6) {
      return Toast.show({
        type: "error",
        text1: "Weak Password",
        text2: "Password must be at least 6 characters.",
      });
    }

    const auth = getAuth();
    const user = auth.currentUser;

    if (!user || !user.email) {
      return Toast.show({
        type: "error",
        text1: "Authentication Error",
        text2: "No logged-in user found.",
      });
    }

    setLoading(true);
    try {
      // Re-authenticate
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);

      Toast.show({
        type: "success",
        text1: "Password Updated",
        text2: "Your password has been changed.",
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Update Failed",
        text2: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Change Password</Text>

      <TextInput
        style={styles.input}
        placeholder="Current Password"
        secureTextEntry
        value={currentPassword}
        onChangeText={setCurrentPassword}
      />

      <TextInput
        style={styles.input}
        placeholder="New Password"
        secureTextEntry
        value={newPassword}
        onChangeText={setNewPassword}
      />

      <TextInput
        style={styles.input}
        placeholder="Confirm New Password"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />

      <TouchableOpacity
        style={[styles.button, loading && { opacity: 0.6 }]}
        onPress={handleChangePassword}
        disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Update Password</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1, justifyContent: "center" },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 30,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  button: {
    backgroundColor: "#4f46e5",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 16 },
});
