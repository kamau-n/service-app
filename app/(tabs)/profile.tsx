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
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { useAuth } from "@/context/auth-context";
import { Colors } from "@/constants/Colors";

interface Service {
  id: string;
  title: string;
  price: number;
  images: string[];
  rating: number;
}

interface UserStats {
  totalServices: number;
  averageRating: number;
  followers: number;
  following: number;
}

export default function ProfileScreen() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userStats, setUserStats] = useState<UserStats>({
    totalServices: 0,
    averageRating: 0,
    followers: 0,
    following: 0,
  });
  const [isFollowing, setIsFollowing] = useState(false);
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const profileId = (params.id as string) || user?.uid;
  const isOwnProfile = user?.uid === profileId;
  const db = getFirestore();

  useEffect(() => {
    if (!user || !profileId) return;

    const followsRef = collection(db, "follows");
    const q = query(
      followsRef,
      where("followerId", "==", user.uid),
      where("followingId", "==", profileId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setIsFollowing(!snapshot.empty);
    });

    return () => unsubscribe();
  }, [user, profileId]);

  const fetchUserStats = async () => {
    try {
      const followersQuery = query(
        collection(db, "follows"),
        where("followingId", "==", profileId)
      );
      const followersSnapshot = await getDocs(followersQuery);
      const followersCount = followersSnapshot.size;

      const followingQuery = query(
        collection(db, "follows"),
        where("followerId", "==", profileId)
      );
      const followingSnapshot = await getDocs(followingQuery);
      const followingCount = followingSnapshot.size;

      const totalRating = services.reduce(
        (acc, service) => acc + service.rating,
        0
      );

      setUserStats({
        totalServices: services.length,
        averageRating: services.length > 0 ? totalRating / services.length : 0,
        followers: followersCount,
        following: followingCount,
      });
    } catch (error) {
      console.error("Error fetching user stats:", error);
    }
  };

  const fetchUserServices = async () => {
    if (!profileId) return;

    try {
      setLoading(true);
      const servicesRef = collection(db, "services");
      const q = query(servicesRef, where("providerId", "==", profileId));
      const querySnapshot = await getDocs(q);

      const servicesData: Service[] = [];
      querySnapshot.forEach((doc) => {
        servicesData.push({ id: doc.id, ...doc.data() } as Service);
      });

      setServices(servicesData);
      await fetchUserStats();
    } catch (error) {
      console.error("Error fetching services:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to load services",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!user || !profileId) {
      Toast.show({
        type: "error",
        text1: "Please sign in to follow users",
      });
      return;
    }

    try {
      const followsRef = collection(db, "follows");
      const q = query(
        followsRef,
        where("followerId", "==", user.uid),
        where("followingId", "==", profileId)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        await addDoc(followsRef, {
          followerId: user.uid,
          followingId: profileId,
          createdAt: serverTimestamp(),
        });
        Toast.show({
          type: "success",
          text1: "Following user",
        });
      } else {
        const followDoc = querySnapshot.docs[0];
        await deleteDoc(doc(db, "follows", followDoc.id));
        Toast.show({
          type: "success",
          text1: "Unfollowed user",
        });
      }

      await fetchUserStats();
    } catch (error) {
      console.error("Error toggling follow:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to update follow status",
      });
    }
  };

  useEffect(() => {
    fetchUserServices();
  }, [profileId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUserServices();
  };

  const handleDeleteService = (serviceId: string) => {
    Alert.alert(
      "Delete Service",
      "Are you sure you want to delete this service?",
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
                text1: "Service deleted successfully",
              });
            } catch (error) {
              Toast.show({
                type: "error",
                text1: "Failed to delete service",
              });
            }
          },
        },
      ]
    );
  };

  const renderServiceItem = ({ item }: { item: Service }) => (
    <TouchableOpacity
      style={styles.serviceCard}
      onPress={() => router.push(`/service/${item.id}`)}>
      <Image
        source={{
          uri: item.images?.[0] || "https://source.unsplash.com/random/400x300",
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
              color={star <= item.rating ? Colors.warning : "#E0E0E0"}
            />
          ))}
          <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteService(item.id)}>
        <Feather name="trash-2" size={18} color={Colors.error} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        <View style={styles.header}>
          <View style={styles.coverPhoto}>
            <Image
              source={{ uri: "https://source.unsplash.com/random/800x200" }}
              style={styles.coverImage}
            />
            <TouchableOpacity style={styles.editCoverButton}>
              <Feather name="camera" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              <Image
                source={{
                  uri:
                    user?.photoURL ||
                    "https://source.unsplash.com/random/200x200",
                }}
                style={styles.profileImage}
              />
              <TouchableOpacity
                style={styles.editAvatarButton}
                onPress={() => router.push("/edit-profile")}>
                <Feather name="camera" size={16} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {user?.displayName || "User"}
              </Text>
              <Text style={styles.profileBio}>
                Professional service provider
              </Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
            </View>

            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{userStats.totalServices}</Text>
                <Text style={styles.statLabel}>Services</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {userStats.averageRating.toFixed(1)}
                </Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{userStats.followers}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{userStats.following}</Text>
                <Text style={styles.statLabel}>Following</Text>
              </View>
            </View>

            <View style={styles.actionButtons}>
              {isOwnProfile ? (
                <>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.primaryButton]}
                    onPress={() => router.push("/edit-profile")}>
                    <Text style={styles.actionButtonText}>Edit Profile</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.secondaryButton]}
                    onPress={() => router.push("/create-service")}>
                    <Text
                      style={[
                        styles.actionButtonText,
                        { color: Colors.primary },
                      ]}>
                      Add Service
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.primaryButton,
                    isFollowing && styles.followingButton,
                  ]}
                  onPress={handleFollowToggle}>
                  <Text
                    style={[
                      styles.actionButtonText,
                      isFollowing && styles.followingButtonText,
                    ]}>
                    {isFollowing ? "Following" : "Follow"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        <View style={styles.servicesSection}>
          <Text style={styles.sectionTitle}>My Services</Text>
          {services.length === 0 ? (
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
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: "#fff",
    marginBottom: 16,
  },
  coverPhoto: {
    height: 200,
    position: "relative",
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  editCoverButton: {
    position: "absolute",
    right: 16,
    bottom: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 8,
    borderRadius: 20,
  },
  profileSection: {
    padding: 16,
    marginTop: -40,
  },
  avatarContainer: {
    position: "relative",
    alignSelf: "center",
    marginBottom: 16,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: "#fff",
  },
  editAvatarButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    padding: 8,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#fff",
  },
  profileInfo: {
    alignItems: "center",
    marginBottom: 16,
  },
  profileName: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 4,
  },
  profileBio: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 20,
    minWidth: 120,
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: Colors.primary,
  },
  secondaryButton: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  servicesSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
    color: Colors.text,
  },
  serviceCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  serviceImage: {
    width: 100,
    height: 100,
  },
  serviceInfo: {
    flex: 1,
    padding: 12,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 4,
  },
  servicePrice: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: "600",
    marginBottom: 4,
  },
  serviceRating: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  deleteButton: {
    padding: 12,
    justifyContent: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
  },
  emptyAddButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
  },
  emptyAddButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  followingButton: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  followingButtonText: {
    color: Colors.primary,
  },
});
