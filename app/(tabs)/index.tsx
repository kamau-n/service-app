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
}

export default function HomeScreen() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const db = getFirestore();

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

  const filteredServices = services.filter(
    (service) =>
      service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.location.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderServiceItem = ({ item }: { item: Service }) => (
    <TouchableOpacity
      style={styles.serviceCard}
      onPress={() => router.push(`/service/${item.id}`)}>
      <Image
        source={{
          uri:
            item.images && item.images.length > 0
              ? item.images[0]
              : "https://placeholder.svg?height=200&width=400",
        }}
        style={styles.serviceImage}
      />
      <View style={styles.serviceInfo}>
        <Text style={styles.serviceTitle}>{item.title}</Text>
        <Text style={styles.servicePrice}>${item.price}</Text>

        <View style={styles.serviceLocation}>
          <Feather name="map-pin" size={14} color="#666" />
          <Text style={styles.locationText} numberOfLines={1}>
            {item.location.address}
          </Text>
        </View>

        <View style={styles.serviceRating}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Feather
              key={star}
              name="star"
              size={16}
              color={star <= item.rating ? "#FFD700" : "#E0E0E0"}
            />
          ))}
          <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
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
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      {/* <StatusBar style="dark" /> */}
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
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Feather name="x" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 10,
    marginVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 8,
  },
  listContainer: {
    padding: 16,
  },
  serviceCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  serviceImage: {
    width: "100%",
    height: 180,
    resizeMode: "cover",
  },
  serviceInfo: {
    padding: 16,
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#111",
  },
  servicePrice: {
    fontSize: 18,
    fontWeight: "600",
    color: "#4f46e5",
    marginBottom: 8,
  },
  serviceLocation: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
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
    marginBottom: 12,
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 14,
    color: "#666",
  },
  providerInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  providerImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
  },
  providerName: {
    fontSize: 14,
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
  },
});
