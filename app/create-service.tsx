"use client";

import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useAuth } from "../context/auth-context";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { router } from "expo-router";
import MapView, { Marker } from "react-native-maps";
import Toast from "react-native-toast-message";

export default function CreateServiceScreen() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [location, setLocation] = useState({
    address: "",
    latitude: 37.7749,
    longitude: -122.4194,
  });
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { user } = useAuth();
  const db = getFirestore();
  const storage = getStorage();

  // Request permissions on component mount
  useEffect(() => {
    (async () => {
      if (Platform.OS !== "web") {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission needed",
            "Sorry, we need camera roll permissions to upload images!"
          );
        }
      }
    })();
  }, []);

  const pickImage = async () => {
    if (images.length >= 5) {
      Alert.alert("Limit Reached", "You can upload a maximum of 5 images");
      return;
    }

    try {
      console.log("Attempting to pick an image...");

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

      // Launch image picker with correct mediaTypes format
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, // Correct mediaTypes
        allowsEditing: false,
        quality: 0.7,
      });

      console.log("Image picker result:", JSON.stringify(result));

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newImage = result.assets[0].uri;
        console.log("Selected image URI:", newImage);
        setImages([...images, newImage]);

        Toast.show({
          type: "success",
          text1: "Image Added",
          text2: `Image ${images.length + 1} added successfully`,
        });
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert(
        "Error Selecting Image",
        "There was a problem selecting your image. Please try again or use a different image."
      );
    }
  };

  // const pickImage = async () => {
  //   if (images.length >= 5) {
  //     Alert.alert("Limit Reached", "You can upload a maximum of 5 images");
  //     return;
  //   }

  //   try {
  //     console.log("Attempting to pick an image...");

  //     // Check permissions again just to be safe
  //     if (Platform.OS !== "web") {
  //       const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
  //       console.log("Permission status:", status);

  //       if (status !== "granted") {
  //         const { status: newStatus } =
  //           await ImagePicker.requestMediaLibraryPermissionsAsync();
  //         console.log("New permission status:", newStatus);

  //         if (newStatus !== "granted") {
  //           Alert.alert(
  //             "Permission denied",
  //             "We need access to your photos to continue"
  //           );
  //           return;
  //         }
  //       }
  //     }

  //     // Launch image picker with more basic options to reduce potential issues
  //     // const result = await ImagePicker.launchImageLibraryAsync({
  //     //   mediaTypes: ImagePicker.MediaTypeOptions.Images,
  //     //   allowsEditing: false, // Set to false to simplify the process
  //     //   quality: 0.7,
  //     // });

  //     const result = await ImagePicker.launchImageLibraryAsync({
  //       mediaTypes: ImagePicker.MediaTypeOptions.Images, // Correct usage
  //       allowsEditing: false,
  //       quality: 0.7,
  //     });

  //     console.log("Image picker result:", JSON.stringify(result));

  //     if (!result.canceled && result.assets && result.assets.length > 0) {
  //       const newImage = result.assets[0].uri;
  //       console.log("Selected image URI:", newImage);
  //       setImages([...images, newImage]);

  //       Toast.show({
  //         type: "success",
  //         text1: "Image Added",
  //         text2: `Image ${images.length + 1} added successfully`,
  //       });
  //     }
  //   } catch (error) {
  //     console.error("Error picking image:", error);
  //     Alert.alert(
  //       "Error Selecting Image",
  //       "There was a problem selecting your image. Please try again or use a different image."
  //     );
  //   }
  // };

  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert("Permission Required", "Please grant location permissions");
        return;
      }

      setLoading(true);
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      // Get address from coordinates
      const addressResponse = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (addressResponse && addressResponse.length > 0) {
        const address = addressResponse[0];
        const formattedAddress = [
          address.street,
          address.city,
          address.region,
          address.postalCode,
          address.country,
        ]
          .filter(Boolean)
          .join(", ");

        setLocation({
          address: formattedAddress,
          latitude,
          longitude,
        });
      }
    } catch (error) {
      console.error("Error getting location:", error);
      Alert.alert("Error", "Failed to get your current location");
    } finally {
      setLoading(false);
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      console.log("Starting image upload:", uri);

      // Create a blob from the image URI
      const response = await fetch(uri);
      const blob = await response.blob();
      console.log("Blob created, size:", blob.size);

      // Generate a unique filename
      const filename = `service_${Date.now()}_${Math.random()
        .toString(36)
        .substring(7)}.jpg`;
      const storageRef = ref(storage, `services/${user?.uid}/${filename}`);
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
      console.error("Error in uploadImage:", error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (!title || !description || !price || !location.address) {
      Toast.show({
        type: "error",
        text1: "Missing Information",
        text2: "Please fill in all fields and add at least one image",
      });
      return;
    }

    if (!user) {
      Toast.show({
        type: "error",
        text1: "Authentication Required",
        text2: "Please sign in to create a service",
      });
      return;
    }

    try {
      setLoading(true);
      setUploadProgress(0);

      // Upload images
      const imageUrls = [];
      console.log(`Starting upload of ${images.length} images`);

      for (let i = 0; i < images.length; i++) {
        try {
          console.log(`Uploading image ${i + 1}/${images.length}`);
          const imageUrl = await uploadImage(images[i]);
          imageUrls.push(imageUrl);
          setUploadProgress((i + 1) / images.length);
        } catch (error) {
          console.error(`Error uploading image ${i + 1}:`, error);
          Toast.show({
            type: "error",
            text1: `Error uploading image ${i + 1}`,
            text2: "Please try again",
          });
          // Continue with other images
        }
      }

      // if (imageUrls.length === 0) {
      //   throw new Error("Failed to upload any images");
      // }

      // Create service document
      console.log("Creating service document with images:", imageUrls);
      await addDoc(collection(db, "services"), {
        title,
        description,
        price: Number.parseFloat(price),
        location,
        images: imageUrls,
        rating: 0,
        providerId: user.uid,
        providerName: user.displayName || "Anonymous",
        providerImage: user.photoURL || null,
        providerPhone: user.phoneNumber || "",
        createdAt: serverTimestamp(),
      });

      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Your service has been created",
      });

      router.back();
    } catch (error: any) {
      console.error("Error creating service:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message || "Failed to create service",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 30 }}>
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Service Information</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter service title"
              value={title}
              onChangeText={setTitle}
              maxLength={50}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your service in detail"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Price ($)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter price"
              value={price}
              onChangeText={(text) => setPrice(text.replace(/[^0-9.]/g, ""))}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Images</Text>
          <Text style={styles.sectionSubtitle}>
            Add up to 5 images to showcase your service
          </Text>

          <View style={styles.imagesContainer}>
            {images.map((image, index) => (
              <View key={index} style={styles.imageWrapper}>
                <Image source={{ uri: image }} style={styles.imagePreview} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => removeImage(index)}>
                  <Feather name="x" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}

            {images.length < 5 && (
              <TouchableOpacity
                style={styles.addImageButton}
                onPress={pickImage}
                activeOpacity={0.6}>
                <Feather name="plus" size={24} color="#4f46e5" />
                <Text style={styles.addImageText}>Add Image</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Location</Text>

          <View style={styles.inputContainer}>
            <View style={styles.locationInputContainer}>
              <TextInput
                style={[styles.input, styles.locationInput]}
                placeholder="Enter your service location"
                value={location.address}
                onChangeText={(text) =>
                  setLocation({ ...location, address: text })
                }
              />
              <TouchableOpacity
                style={styles.locationButton}
                onPress={getCurrentLocation}
                disabled={loading}>
                <Feather name="map-pin" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {location.latitude && location.longitude && (
            <View style={styles.mapContainer}>
              <MapView
                style={styles.map}
                region={{
                  latitude: location.latitude,
                  longitude: location.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}>
                <Marker
                  coordinate={{
                    latitude: location.latitude,
                    longitude: location.longitude,
                  }}
                  draggable
                  onDragEnd={(e) => {
                    setLocation({
                      ...location,
                      latitude: e.nativeEvent.coordinate.latitude,
                      longitude: e.nativeEvent.coordinate.longitude,
                    });
                  }}
                />
              </MapView>
              <Text style={styles.mapHint}>
                Drag the pin to adjust location
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={loading}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.submitButtonText}>
                {uploadProgress < 1
                  ? `Uploading ${Math.round(uploadProgress * 100)}%`
                  : "Creating..."}
              </Text>
            </View>
          ) : (
            <Text style={styles.submitButtonText}>Create Service</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    padding: 16,
  },
  formSection: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    color: "#111",
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f9fafb",
  },
  textArea: {
    minHeight: 100,
  },
  imagesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  imageWrapper: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
    position: "relative",
  },
  imagePreview: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  removeImageButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#ff4d4f",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  addImageButton: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  addImageText: {
    color: "#4f46e5",
    marginTop: 4,
    fontSize: 12,
  },
  locationInputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationInput: {
    flex: 1,
    marginRight: 8,
  },
  locationButton: {
    backgroundColor: "#4f46e5",
    borderRadius: 8,
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  mapContainer: {
    height: 200,
    borderRadius: 8,
    overflow: "hidden",
    marginTop: 8,
  },
  map: {
    width: "100%",
    height: "100%",
  },
  mapHint: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    padding: 8,
    borderRadius: 4,
    fontSize: 12,
    color: "#333",
  },
  submitButton: {
    backgroundColor: "#4f46e5",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 16,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
});
