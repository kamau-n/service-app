import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Alert,
  Switch,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { useAuth } from "@/context/auth-context";
import { Colors } from "@/constants/Colors";
import * as Notifications from "expo-notifications";

interface Follower {
  id: string;
  followerName: string;
  followerImage?: string;
  createdAt: any;
}

export default function FollowersScreen() {
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const profileId = params.id ? String(params.id) : user?.uid;

  const db = getFirestore();

  useEffect(() => {
    if (!profileId) return;

    const fetchFollowers = async () => {
      console.log("this is the profile id", profileId);
      try {
        setLoading(true);
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
        Toast.show({
          type: "error",
          text1: "Failed to load followers",
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

    fetchFollowers();
  }, [profileId]);

  const onRefresh = () => {
    setRefreshing(true);
    setFollowers([]); // Reset the followers array to start fresh
    // fetchFollowers();
  };

  const viewProfile = (userId: string) => {
    if (userId === user?.uid) {
      router.replace("/userprofile");
    } else {
      router.push({
        pathname: "/userprofile",
        params: { id: userId },
      });
    }
  };

  if (loading) {
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
        <View style={styles.profileSection}>
          <Text style={styles.profileHeader}>Followers</Text>
          {followers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather name="user" size={60} color="#ccc" />
              <Text style={styles.emptyText}>No followers yet</Text>
            </View>
          ) : (
            <FlatList
              data={followers}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.followerItem}
                  onPress={() => {
                    console.log("following id is " + item.id);
                    viewProfile(item.id);
                  }}>
                  <Image
                    source={{
                      uri:
                        item.followerImage ||
                        "https://source.unsplash.com/random/100x100",
                    }}
                    style={styles.followerImage}
                  />
                  <View style={styles.followerInfo}>
                    <Text style={styles.followerName}>{item.followerName}</Text>
                    <Text style={styles.followerDate}>
                      Followed {formatTimestamp(item.createdAt)}
                    </Text>
                  </View>
                  <Feather
                    name="chevron-right"
                    size={20}
                    color={Colors.textSecondary}
                  />
                </TouchableOpacity>
              )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  profileSection: {
    padding: 16,
  },
  profileHeader: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    color: Colors.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 18,
    color: "#ccc",
    textAlign: "center",
  },
  followerItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  followerImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
  },
  followerInfo: {
    flex: 1,
  },
  followerName: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.primary,
  },
  followerDate: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  emptyText: {
    fontSize: 18,
    color: "#ccc",
    textAlign: "center",
  },
});

function formatTimestamp(timestamp: any) {
  // You can format the timestamp however you want here
  const date = new Date(timestamp.seconds * 1000); // Convert Firestore timestamp to Date
  return date.toLocaleDateString();
}
