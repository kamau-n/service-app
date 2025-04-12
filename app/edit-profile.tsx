"use client";

import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "../context/auth-context";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateProfile } from "firebase/auth";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import Toast from "react-native-toast-message";
import { SafeAreaView } from "react-native-safe-area-context";

export default function EditProfileScreen() {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const db = getFirestore();
  const storage = getStorage();

  useEffect(() => {
    // Request permissions on component mount
    (async () => {
      if (Platform.OS !== "web") {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission needed",
            "Sorry, we need camera roll permissions to upload profile image!"
          );
        }
      }
    })();

    // Load user data
    const loadUserData = async () => {
      if (!user) {
        router.replace("/(auth)/login");
        return;
      }

      try {
        setInitialLoading(true);
        const userDoc = await getDoc(doc(db, "users", user.uid));

        if (userDoc.exists()) {
          const userData = userDoc.data();
          setDisplayName(userData.displayName || "");
          setPhoneNumber(userData.phoneNumber || "");
          setEmail(user.email || "");
          setProfileImage(user.photoURL || null);
        } else {
          // If user document doesn't exist in Firestore, use auth data
          setDisplayName(user.displayName || "");
          setEmail(user.email || "");
          setProfileImage(user.photoURL || null);
        }
      } catch (error) {
        console.error("Error loading user data:", error);
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Failed to load your profile data",
        });
      } finally {
        setInitialLoading(false);
      }
    };

    loadUserData();
  }, [user]);

  const pickImage = async () => {
    try {
      console.log("Attempting to pick a profile image...");

      // Check permissions again just to be safe
      if (Platform.OS !== "web") {
        const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
        console.log("Permission status:", status);

        if (status !== "granted") {
          const { status: newStatus } =
            await ImagePicker.requestMediaLibraryPermissionsAsync();
          console.log("New permission status:", newStatus);

          if (newStatus !== "granted") {
            Alert.alert(
              "Permission denied",
              "We need access to your photos to continue"
            );
            return;
          }
        }
      }

      // Launch image picker with more basic options
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // Set to false to simplify the process
        quality: 0.7,
      });

      console.log("Image picker result:", JSON.stringify(result));

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setProfileImage(result.assets[0].uri);
        console.log("Selected profile image URI:", result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking profile image:", error);
      Alert.alert(
        "Error Selecting Image",
        "There was a problem selecting your image. Please try again or use a different image."
      );
    }
  };

  const uploadProfileImage = async (uri: string) => {
    if (!user) return null;

    try {
      console.log("Starting profile image upload:", uri);

      // Create a blob from the image URI
      const response = await fetch(uri);
      const blob = await response.blob();
      console.log("Blob created, size:", blob.size);

      // Generate a unique filename
      const filename = `profile_${user.uid}_${Date.now()}.jpg`;
      const storageRef = ref(storage, `profiles/${user.uid}/${filename}`);
      console.log("Storage reference created:", storageRef.fullPath);

      // Upload the blob
      console.log("Starting upload task...");
      const uploadTask = await uploadBytes(storageRef, blob);
      console.log("Upload completed:", uploadTask.ref.fullPath);

      // Get the download URL
      const downloadURL = await getDownloadURL(uploadTask.ref);
      console.log("Download URL obtained:", downloadURL);

      return downloadURL;
    } catch (error) {
      console.error("Error uploading profile image:", error);
      throw error;
    }
  };

  const handleSave = async () => {
    if (!user) return;

    if (!displayName.trim()) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Name cannot be empty",
      });
      return;
    }

    try {
      setLoading(true);
      let photoURL = user.photoURL;

      // Upload new profile image if changed
      if (profileImage && profileImage !== user.photoURL) {
        console.log("Uploading new profile image");
        photoURL = await uploadProfileImage(profileImage);
      }

      // Update Firebase Auth profile
      console.log("Updating Firebase Auth profile");
      await updateProfile(user, {
        displayName,
        photoURL,
      });

      // Update Firestore user document
      console.log("Updating Firestore user document");
      await updateDoc(doc(db, "users", user.uid), {
        displayName,
        phoneNumber,
        photoURL,
        updatedAt: new Date(),
      });

      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Profile updated successfully",
      });

      // Go back to profile screen
      router.back();
    } catch (error) {
      console.error("Error updating profile:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to update profile",
      });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Edit Profile</Text>
            <Text style={styles.subtitle}>
              Update your personal information
            </Text>
          </View>

          <View style={styles.profileImageContainer}>
            <Image
              source={{
                uri:
                  profileImage ||
                  "https://placeholder.svg?height=150&width=150",
              }}
              style={styles.profileImage}
            />
            <TouchableOpacity
              style={styles.changePhotoButton}
              onPress={pickImage}>
              <Feather name="camera" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Enter your full name"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, styles.disabledInput]}
                value={email}
                editable={false}
              />
              <Text style={styles.helperText}>Email cannot be changed</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="Enter your phone number"
                keyboardType="phone-pad"
              />
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  scrollContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginTop: 4,
  },
  profileImageContainer: {
    alignItems: "center",
    marginBottom: 24,
    position: "relative",
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#eee",
  },
  changePhotoButton: {
    position: "absolute",
    bottom: 0,
    right: "35%",
    backgroundColor: "#4f46e5",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  formContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: "#333",
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f9fafb",
  },
  disabledInput: {
    backgroundColor: "#f0f0f0",
    color: "#666",
  },
  helperText: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: "#4f46e5",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
