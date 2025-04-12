"use client";

import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "../../context/auth-context";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

interface Service {
  id: string;
  title: string;
  price: number;
  images: string[];
  rating: number;
}

export default function ProfileScreen() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user, signOut } = useAuth();
  const db = getFirestore();

  const fetchUserServices = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const servicesRef = collection(db, "services");
      const q = query(servicesRef, where("providerId", "==", user.uid));
      const querySnapshot = await getDocs(q);

      const servicesData: Service[] = [];
      querySnapshot.forEach((doc) => {
        servicesData.push({ id: doc.id, ...doc.data() } as Service);
      });

      setServices(servicesData);
    } catch (error) {
      console.error("Error fetching services:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to load your services",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUserServices();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUserServices();
  };

  const handleDeleteService = (serviceId: string) => {
    Alert.alert(
      "Delete Service",
      "Are you sure you want to delete this service? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "services", serviceId));
              setServices(
                services.filter((service) => service.id !== serviceId)
              );
              Toast.show({
                type: "success",
                text1: "Success",
                text2: "Service deleted successfully",
              });
            } catch (error) {
              console.error("Error deleting service:", error);
              Toast.show({
                type: "error",
                text1: "Error",
                text2: "Failed to delete service",
              });
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
          } catch (error) {
            console.error("Error signing out:", error);
          }
        },
      },
    ]);
  };

  const navigateToEditProfile = () => {
    router.push("/edit-profile");
  };

  const renderServiceItem = ({ item }: { item: Service }) => (
    <View style={styles.serviceCard}>
      <Image
        source={{
          uri:
            item.images && item.images.length > 0
              ? item.images[0]
              : "https://placeholder.svg?height=100&width=100",
        }}
        style={styles.serviceImage}
      />
      <View style={styles.serviceInfo}>
        <Text style={styles.serviceTitle}>{item.title}</Text>
        <Text style={styles.servicePrice}>${item.price}</Text>
        <View style={styles.serviceRating}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Feather
              key={star}
              name="star"
              size={14}
              color={star <= item.rating ? "#FFD700" : "#E0E0E0"}
            />
          ))}
        </View>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteService(item.id)}>
        <Feather name="trash-2" size={18} color="#ff4d4f" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.header}>
        <View style={styles.profileSection}>
          <Image
            source={{
              uri:
                user?.photoURL ||
                "https://placeholder.svg?height=100&width=100",
            }}
            style={styles.profileImage}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {user?.displayName || "User"}
            </Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={navigateToEditProfile}>
            <Feather name="edit-2" size={18} color="#4f46e5" />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Feather name="log-out" size={18} color="#ff4d4f" />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.servicesHeader}>
        <Text style={styles.servicesTitle}>My Services</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push("/create-service")}>
          <Feather name="plus" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add New</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : services.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="package" size={60} color="#ccc" />
          <Text style={styles.emptyText}>No services yet</Text>
          <Text style={styles.emptySubtext}>
            Start by adding your first service
          </Text>
          <TouchableOpacity
            style={styles.emptyAddButton}
            onPress={() => router.push("/create-service")}>
            <Text style={styles.emptyAddButtonText}>Add Service</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={services}
          renderItem={renderServiceItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.servicesList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#4f46e5"]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    backgroundColor: "#fff",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#eee",
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111",
  },
  profileEmail: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f2ff",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  editButtonText: {
    color: "#4f46e5",
    marginLeft: 6,
    fontWeight: "500",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff2f2",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  logoutText: {
    color: "#ff4d4f",
    marginLeft: 6,
    fontWeight: "500",
  },
  servicesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  servicesTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4f46e5",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: "#fff",
    marginLeft: 4,
    fontWeight: "500",
  },
  servicesList: {
    padding: 16,
  },
  serviceCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  serviceImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
  },
  serviceInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#111",
    marginBottom: 4,
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4f46e5",
    marginBottom: 4,
  },
  serviceRating: {
    flexDirection: "row",
  },
  deleteButton: {
    justifyContent: "center",
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  emptyAddButton: {
    backgroundColor: "#4f46e5",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptyAddButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
