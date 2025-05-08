"use client";

import { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import {
  collection,
  getDocs,
  query,
  orderBy,
  getFirestore,
} from "firebase/firestore";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";

interface Service {
  id: string;
  title: string;
  description: string;
  price: number;
  location: {
    address: string;
    latitude: number;
    longitude: number;
  };
  images: string[];
  rating: number;
  providerId: string;
  providerName: string;
  providerImage?: string;
  category?: string;
}

const { width } = Dimensions.get("window");

export default function HomeScreen() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const db = getFirestore();

  const categories = [
    "All",
    "Cleaning",
    "Repair",
    "Delivery",
    "Beauty",
    "Health",
  ];

  const fetchServices = async () => {
    try {
      setLoading(true);
      const servicesRef = collection(db, "services");
      const q = query(servicesRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);

      const servicesData: Service[] = [];
      querySnapshot.forEach((doc) => {
        servicesData.push({ id: doc.id, ...doc.data() } as Service);
      });

      setServices(servicesData);
    } catch (error) {
      console.error("Error fetching services:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchServices();
  };

  const filteredServices = services.filter((service) => {
    const matchesSearch =
      service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.location.address
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

    const matchesCategory =
      activeCategory === "All" || service.category === activeCategory;

    return matchesSearch && matchesCategory;
  });

  const formatPrice = (price: number) => {
    return `$${price.toFixed(2)}`;
  };

  const renderCategoryItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[
        styles.categoryPill,
        activeCategory === item && styles.activeCategoryPill,
      ]}
      onPress={() => setActiveCategory(item)}>
      <Text
        style={[
          styles.categoryText,
          activeCategory === item && styles.activeCategoryText,
        ]}>
        {item}
      </Text>
    </TouchableOpacity>
  );

  const renderServiceItem = ({ item }: { item: Service }) => (
    <TouchableOpacity
      style={styles.serviceCard}
      activeOpacity={0.9}
      onPress={() => {
        router.push({
          pathname: `/service/${item.id}`,
          params: {
            name: item.title,
          },
        });
      }}>
      <View style={styles.imageContainer}>
        <Image
          source={{
            uri:
              item.images && item.images.length > 0
                ? item.images[0]
                : "https://placeholder.svg?height=200&width=400",
          }}
          style={styles.serviceImage}
        />
        <View style={styles.priceTag}>
          <Text style={styles.priceText}>{formatPrice(item.price)}</Text>
        </View>
      </View>

      <View style={styles.serviceInfo}>
        <View style={styles.titleRow}>
          <Text style={styles.serviceTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={styles.serviceRating}>
            <Feather name="star" size={14} color="#FFD700" />
            <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
          </View>
        </View>

        <Text style={styles.serviceDescription} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.serviceLocation}>
          <Feather name="map-pin" size={14} color="#666" />
          <Text style={styles.locationText} numberOfLines={1}>
            {item.location.address}
          </Text>
        </View>

        <View style={styles.providerInfo}>
          <Image
            source={{
              uri:
                item.providerImage ||
                "https://placeholder.svg?height=30&width=30",
            }}
            style={styles.providerImage}
          />
          <Text style={styles.providerName}>{item.providerName}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Find Services</Text>
        <TouchableOpacity style={styles.notificationButton}>
          <Feather name="bell" size={22} color="#333" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Feather
          name="search"
          size={20}
          color="#666"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search services, providers, or locations"
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Feather name="x" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        horizontal
        data={categories}
        renderItem={renderCategoryItem}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
      />

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4f46e5" />
        </View>
      ) : filteredServices.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="inbox" size={60} color="#ccc" />
          <Text style={styles.emptyText}>No services found</Text>
          <Text style={styles.emptySubtext}>
            {searchQuery
              ? "Try a different search term"
              : "Be the first to add a service!"}
          </Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={fetchServices}>
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredServices}
          renderItem={renderServiceItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
    color: "#333",
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    marginRight: 8,
  },
  activeCategoryPill: {
    backgroundColor: "#4f46e5",
  },
  categoryText: {
    fontSize: 14,
    color: "#666",
  },
  activeCategoryText: {
    color: "#fff",
    fontWeight: "500",
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
  },
  serviceCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  imageContainer: {
    position: "relative",
  },
  serviceImage: {
    width: "100%",
    height: 180,
    resizeMode: "cover",
  },
  priceTag: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "rgba(79, 70, 229, 0.9)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  priceText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  serviceInfo: {
    padding: 16,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111",
    flex: 1,
  },
  serviceDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
    lineHeight: 20,
  },
  serviceLocation: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  locationText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 4,
    flex: 1,
  },
  serviceRating: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  providerInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  providerImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  providerName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
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
    marginBottom: 16,
  },
  refreshButton: {
    backgroundColor: "#4f46e5",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: "#fff",
    fontWeight: "500",
  },
});
