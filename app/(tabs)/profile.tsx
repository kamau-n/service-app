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
  Switch,
  Modal,
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
  increment,
  getDoc,
} from "firebase/firestore";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { useAuth } from "@/context/auth-context";
import { Colors } from "@/constants/Colors";
import * as Notifications from "expo-notifications";

interface Service {
  id: string;
  title: string;
  price: number;
  rateType: string;
  images: string[];
  rating: number;
}

interface UserStats {
  totalServices: number;
  averageRating: number;
  followers: number;
  following: number;
  profileViews: number;
}

interface UserProfile {
  displayName: string;
  email: string;
  photoURL: string | null;
  isPrivate: boolean;
  notificationsEnabled?: boolean;
}

interface Follower {
  id: string;
  followerName: string;
  followerImage?: string;
  createdAt: any;
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
    profileViews: 0,
  });
  const [isFollowing, setIsFollowing] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [showFollowers, setShowFollowers] = useState(false);
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [followersLoading, setFollowersLoading] = useState(false);
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const profileId = params.id ? String(params.id) : user?.uid;
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

    const fetchUserProfile = async () => {
      try {
        const userDoc = await getDocs(
          query(collection(db, "users"), where("uid", "==", profileId))
        );
        if (!userDoc.empty) {
          const userData = userDoc.docs[0].data();
          setUserProfile({
            displayName: userData.displayName,
            email: userData.email,
            photoURL: userData.photoURL,
            isPrivate: userData.isPrivate || false,
            notificationsEnabled: userData.notificationsEnabled ?? true,
          });
          setIsPrivate(userData.isPrivate || false);
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };

    fetchUserProfile();

    if (!isOwnProfile) {
      trackProfileView();
    }

    return () => unsubscribe();
  }, [user, profileId]);

  const fetchFollowers = async () => {
    if (!profileId) return;

    try {
      setFollowersLoading(true);
      const followersQuery = query(
        collection(db, "follows"),
        where("followingId", "==", profileId)
      );
      const snapshot = await getDocs(followersQuery);

      const followersData: Follower[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        followerName: doc.data().followerName,
        followerImage: doc.data().followerImage,
        createdAt: doc.data().createdAt,
      }));

      setFollowers(followersData);
    } catch (error) {
      console.error("Error fetching followers:", error);
    } finally {
      setFollowersLoading(false);
    }
  };

  const viewProfile = (userId: string) => {
    setShowFollowers(false);
    if (userId === user?.uid) {
      router.replace("/(tabs)/profile");
    } else {
      router.push({
        pathname: "/(tabs)/profile",
        params: { id: userId },
      });
    }
  };

  const trackProfileView = async () => {
    try {
      const userRef = doc(db, "users", profileId);
      await updateDoc(userRef, {
        profileViews: increment(1),
      });

      const viewsRef = collection(db, "profileViews");
      await addDoc(viewsRef, {
        viewerId: user?.uid,
        viewerName: user?.displayName,
        profileId,
        timestamp: serverTimestamp(),
      });

      if (userProfile?.notificationsEnabled) {
        await scheduleNotification(
          "New Profile View",
          `${user?.displayName} viewed your profile`
        );
      }
    } catch (error) {
      console.error("Error tracking profile view:", error);
    }
  };

  const scheduleNotification = async (title: string, body: string) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
      },
      trigger: null,
    });
  };

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

      const userDoc = await getDoc(doc(db, "users", profileId));
      const profileViews = userDoc.data()?.profileViews || 0;

      const totalRating = services.reduce(
        (acc, service) => acc + service.rating,
        0
      );

      setUserStats({
        totalServices: services.length,
        averageRating: services.length > 0 ? totalRating / services.length : 0,
        followers: followersCount,
        following: followingCount,
        profileViews,
      });
    } catch (error) {
      console.error("Error fetching user stats:", error);
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
          followerName: user.displayName,
          createdAt: serverTimestamp(),
        });

        if (userProfile?.notificationsEnabled) {
          await scheduleNotification(
            "New Follower",
            `${user.displayName} started following you`
          );
        }

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

  const toggleNotifications = async () => {
    if (!user) return;

    try {
      const userRef = doc(db, "users", user.uid);
      const newValue = !userProfile?.notificationsEnabled;
      await updateDoc(userRef, {
        notificationsEnabled: newValue,
      });
      setUserProfile((prev) =>
        prev ? { ...prev, notificationsEnabled: newValue } : null
      );
      Toast.show({
        type: "success",
        text1: `Notifications ${newValue ? "enabled" : "disabled"}`,
      });
    } catch (error) {
      console.error("Error updating notification settings:", error);
      Toast.show({
        type: "error",
        text1: "Failed to update notification settings",
      });
    }
  };

  const handlePrivacyToggle = async () => {
    if (!user) return;

    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        isPrivate: !isPrivate,
      });
      setIsPrivate(!isPrivate);
      Toast.show({
        type: "success",
        text1: `Profile is now ${!isPrivate ? "private" : "public"}`,
      });
    } catch (error) {
      console.error("Error updating privacy settings:", error);
      Toast.show({
        type: "error",
        text1: "Failed to update privacy settings",
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
        <Text style={styles.servicePrice}>
          ${item.price} per {item.rateType}
        </Text>
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
      {isOwnProfile && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteService(item.id)}>
          <Feather name="trash-2" size={18} color={Colors.error} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  const renderFollower = ({ item }: { item: Follower }) => (
    <TouchableOpacity
      style={styles.followerItem}
      onPress={() => viewProfile(item.id)}>
      <Image
        source={{
          uri:
            item.followerImage || "https://source.unsplash.com/random/100x100",
        }}
        style={styles.followerImage}
      />
      <View style={styles.followerInfo}>
        <Text style={styles.followerName}>{item.followerName}</Text>
        <Text style={styles.followerDate}>
          Followed {formatTimestamp(item.createdAt)}
        </Text>
      </View>
      <Feather name="chevron-right" size={20} color={Colors.textSecondary} />
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!isOwnProfile && userProfile?.isPrivate && !isFollowing) {
    return (
      <View style={styles.privateContainer}>
        <Feather name="lock" size={48} color={Colors.textSecondary} />
        <Text style={styles.privateText}>This account is private</Text>
        <Text style={styles.privateSubtext}>
          Follow this account to see their services
        </Text>
        <TouchableOpacity
          style={styles.followButton}
          onPress={handleFollowToggle}>
          <Text style={styles.followButtonText}>Follow</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Image
              source={{
                uri:
                  userProfile?.photoURL ||
                  "https://source.unsplash.com/random/200x200",
              }}
              style={styles.profileImage}
            />
            {isOwnProfile && (
              <TouchableOpacity
                style={styles.editAvatarButton}
                onPress={() => router.push("/edit-profile")}>
                <Feather name="camera" size={16} color="#fff" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {userProfile?.displayName || "User"}
            </Text>
            <Text style={styles.profileBio}>Professional service provider</Text>
            <Text style={styles.profileEmail}>{userProfile?.email}</Text>
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
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => {
                fetchFollowers();
                setShowFollowers(true);
              }}>
              <Text style={styles.statNumber}>{userStats.followers}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>
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

          {isOwnProfile && (
            <View style={styles.settingsSection}>
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Private Account</Text>
                <Switch
                  value={isPrivate}
                  onValueChange={handlePrivacyToggle}
                  trackColor={{ false: "#767577", true: Colors.primary }}
                />
              </View>
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Notifications</Text>
                <Switch
                  value={userProfile?.notificationsEnabled}
                  onValueChange={toggleNotifications}
                  trackColor={{ false: "#767577", true: Colors.primary }}
                />
              </View>
            </View>
          )}
        </View>

        <View style={styles.servicesSection}>
          <Text style={styles.sectionTitle}>Services</Text>
          {services.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather name="package" size={60} color="#ccc" />
              <Text style={styles.emptyText}>No services yet</Text>
              <Text style={styles.emptySubtext}>
                {isOwnProfile
                  ? "Start by adding your first service"
                  : "This user hasn't added any services yet"}
              </Text>
              {isOwnProfile && (
                <TouchableOpacity
                  style={styles.emptyAddButton}
                  onPress={() => router.push("/create-service")}>
                  <Text style={styles.emptyAddButtonText}>Add Service</Text>
                </TouchableOpacity>
              )}
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

      <Modal
        visible={showFollowers}
        animationType="slide"
        onRequestClose={() => setShowFollowers(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Followers</Text>
            <TouchableOpacity
              onPress={() => setShowFollowers(false)}
              style={styles.closeButton}>
              <Feather name="x" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          {followersLoading ? (
            <ActivityIndicator size="large" color={Colors.primary} />
          ) : followers.length === 0 ? (
            <View style={styles.emptyFollowers}>
              <Feather name="users" size={48} color={Colors.textSecondary} />
              <Text style={styles.emptyText}>No followers yet</Text>
            </View>
          ) : (
            <FlatList
              data={followers}
              renderItem={renderFollower}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.followersList}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  profileSection: {
    backgroundColor: "#fff",
    padding: 16,
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
  settingsSection: {
    backgroundColor: "#fff",
    padding: 16,
    marginTop: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingLabel: {
    fontSize: 16,
    color: Colors.text,
  },
  privateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  privateText: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.text,
    marginTop: 16,
  },
  privateSubtext: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
  },
  followButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 20,
    marginTop: 24,
  },
  followButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: "#fff",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: Colors.text,
  },
  closeButton: {
    padding: 8,
  },
  followersList: {
    padding: 16,
  },
  followerItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  followerImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  followerInfo: {
    flex: 1,
  },
  followerName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 4,
  },
  followerDate: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  emptyFollowers: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
});
