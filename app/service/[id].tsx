"use client";

import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import {
  doc,
  getDoc,
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import MapView, { Marker } from "react-native-maps";
import { useLocalSearchParams, router } from "expo-router";
import { useAuth } from "@/context/auth-context";

const { width } = Dimensions.get("window");

export default function ServiceDetailsScreen() {
  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { user } = useAuth();
  const { id } = useLocalSearchParams();
  const serviceId = id as string;
  const db = getFirestore();

  useEffect(() => {
    const fetchServiceDetails = async () => {
      try {
        const serviceDoc = await getDoc(doc(db, "services", serviceId));
        if (serviceDoc.exists()) {
          setService({ id: serviceDoc.id, ...serviceDoc.data() });
        } else {
          Alert.alert("Error", "Service not found");
          router.back();
        }
      } catch (error) {
        console.error("Error fetching service details:", error);
        Alert.alert("Error", "Failed to load service details");
      } finally {
        setLoading(false);
      }
    };

    fetchServiceDetails();
  }, [serviceId]);

  const handleContactProvider = async () => {
    if (!user) {
      Alert.alert(
        "Authentication Required",
        "Please sign in to contact the provider"
      );
      return;
    }

    if (user.uid === service.providerId) {
      Alert.alert("Notice", "This is your own service listing");
      return;
    }

    try {
      // Check if chat already exists
      const chatRef = collection(db, "chats");

      // Create a new chat
      const newChat = await addDoc(chatRef, {
        participants: [user.uid, service.providerId],
        participantNames: {
          [user.uid]: user.displayName,
          [service.providerId]: service.providerName,
        },
        serviceId: service.id,
        serviceTitle: service.title,
        lastMessage: `Inquiry about ${service.title}`,
        lastMessageTimestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
      });

      // Navigate to chat screen
      router.push({
        pathname: `/chat/${newChat.id}`,
        params: {
          name: service.providerName,
          recipientId: service.providerId,
        },
      });
    } catch (error) {
      console.error("Error creating chat:", error);
      Alert.alert("Error", "Failed to start conversation");
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Image Gallery */}
      <View style={styles.imageContainer}>
        {service.images && service.images.length > 0 ? (
          <>
            <Image
              source={{ uri: service.images[currentImageIndex] }}
              style={styles.mainImage}
            />
            {service.images.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.thumbnailContainer}>
                {service.images.map((image: string, index: number) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => setCurrentImageIndex(index)}
                    style={[
                      styles.thumbnailWrapper,
                      currentImageIndex === index && styles.activeThumbnail,
                    ]}>
                    <Image source={{ uri: image }} style={styles.thumbnail} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </>
        ) : (
          <Image
            source={{ uri: "https://placeholder.svg?height=300&width=400" }}
            style={styles.mainImage}
          />
        )}
      </View>

      {/* Service Details */}
      <View style={styles.detailsContainer}>
        <Text style={styles.title}>{service.title}</Text>
        <View style={styles.priceRatingContainer}>
          <Text style={styles.price}>${service.price}</Text>
          <View style={styles.ratingContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Feather
                key={star}
                name="star"
                size={16}
                color={star <= service.rating ? "#FFD700" : "#E0E0E0"}
              />
            ))}
            <Text style={styles.ratingText}>{service.rating.toFixed(1)}</Text>
          </View>
        </View>

        {/* Provider Info */}
        <View style={styles.providerContainer}>
          <Image
            source={{
              uri:
                service.providerImage ||
                "https://placeholder.svg?height=50&width=50",
            }}
            style={styles.providerImage}
          />
          <View style={styles.providerInfo}>
            <Text style={styles.providerName}>{service.providerName}</Text>
            <Text style={styles.providerSubtext}>Service Provider</Text>
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{service.description}</Text>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <View style={styles.locationContainer}>
            <Feather name="map-pin" size={16} color="#666" />
            <Text style={styles.locationText}>{service.location.address}</Text>
          </View>

          {service.location.latitude && service.location.longitude && (
            <View style={styles.mapContainer}>
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: service.location.latitude,
                  longitude: service.location.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}>
                <Marker
                  coordinate={{
                    latitude: service.location.latitude,
                    longitude: service.location.longitude,
                  }}
                  title={service.title}
                />
              </MapView>
            </View>
          )}
        </View>
      </View>

      {/* Contact Button */}
      <View style={styles.contactButtonContainer}>
        <TouchableOpacity
          style={styles.contactButton}
          onPress={handleContactProvider}>
          <Feather name="message-circle" size={20} color="#fff" />
          <Text style={styles.contactButtonText}>Contact Provider</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  imageContainer: {
    width: "100%",
    backgroundColor: "#f8f9fa",
  },
  mainImage: {
    width: "100%",
    height: 300,
    resizeMode: "cover",
  },
  thumbnailContainer: {
    padding: 10,
    backgroundColor: "#fff",
  },
  thumbnailWrapper: {
    marginRight: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "transparent",
    overflow: "hidden",
  },
  activeThumbnail: {
    borderColor: "#4f46e5",
  },
  thumbnail: {
    width: 60,
    height: 60,
    resizeMode: "cover",
  },
  detailsContainer: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111",
    marginBottom: 8,
  },
  priceRatingContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  price: {
    fontSize: 22,
    fontWeight: "700",
    color: "#4f46e5",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 14,
    color: "#666",
  },
  providerContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    marginBottom: 20,
  },
  providerImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
  },
  providerSubtext: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111",
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: "#333",
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  locationText: {
    fontSize: 16,
    color: "#333",
    marginLeft: 8,
  },
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 8,
  },
  map: {
    width: "100%",
    height: "100%",
  },
  contactButtonContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  contactButton: {
    backgroundColor: "#4f46e5",
    borderRadius: 8,
    padding: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  contactButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});
