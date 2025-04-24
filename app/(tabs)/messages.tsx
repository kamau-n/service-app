import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  updateDoc,
  doc,
} from "firebase/firestore";
import { router } from "expo-router";
import { formatTimestamp } from "@/utils/format-date";
import { useAuth } from "@/context/auth-context";
import * as Notifications from "expo-notifications";

interface Chat {
  id: string;
  participants: string[];
  participantNames: Record<string, string>;
  serviceId: string;
  serviceTitle: string;
  lastMessage: string;
  lastMessageTimestamp: any;
  lastMessageSender: string;
  unreadCount?: number;
}

export default function ChatListScreen() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const db = getFirestore();

  useEffect(() => {
    if (!user) return;

    const chatsRef = collection(db, "chats");
    const q = query(
      chatsRef,
      where("participants", "array-contains", user.uid),
      orderBy("lastMessageTimestamp", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const chatsList: Chat[] = [];
        snapshot.forEach((doc) => {
          const chatData = doc.data();
          if (chatData.lastMessageSender !== user.uid && !chatData.read) {
            scheduleNotification(
              "New Message",
              `New message from ${
                chatData.participantNames[
                  chatData.participants.find((id: string) => id !== user.uid)
                ]
              }: ${chatData.lastMessage}`
            );
          }
          chatsList.push({ id: doc.id, ...chatData } as Chat);
        });
        setChats(chatsList);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching chats:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const scheduleNotification = async (title: string, body: string) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          badge: 1,
        },
        trigger: null,
      });
    } catch (error) {
      console.error("Error scheduling notification:", error);
    }
  };

  const markChatAsRead = async (chatId: string) => {
    try {
      const chatRef = doc(db, "chats", chatId);
      await updateDoc(chatRef, {
        read: true,
        unreadCount: 0,
      });
    } catch (error) {
      console.error("Error marking chat as read:", error);
    }
  };

  const getOtherParticipantName = (chat: Chat) => {
    if (!user) return "";
    const otherParticipantId = chat.participants.find((id) => id !== user.uid);
    return otherParticipantId ? chat.participantNames[otherParticipantId] : "";
  };

  const renderChatItem = ({ item }: { item: Chat }) => {
    const otherParticipantName = getOtherParticipantName(item);
    const recipientId = item.participants.find((id) => id !== user?.uid);

    return (
      <TouchableOpacity
        style={[styles.chatItem, item.unreadCount && styles.unreadChat]}
        onPress={() => {
          markChatAsRead(item.id);
          router.push({
            pathname: `/chat/${item.id}`,
            params: {
              name: otherParticipantName,
              recipientId: recipientId,
            },
          });
        }}>
        <Image
          source={{ uri: "https://placeholder.svg?height=50&width=50" }}
          style={styles.avatar}
        />
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatName}>{otherParticipantName}</Text>
            <Text style={styles.timestamp}>
              {formatTimestamp(item.lastMessageTimestamp)}
            </Text>
          </View>
          <Text style={styles.serviceTitle}>Re: {item.serviceTitle}</Text>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage}
          </Text>
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {chats.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Feather name="message-square" size={60} color="#ccc" />
          <Text style={styles.emptyText}>No messages yet</Text>
          <Text style={styles.emptySubtext}>
            Your conversations will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          renderItem={renderChatItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.chatList}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  chatList: {
    padding: 12,
  },
  chatItem: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  unreadChat: {
    backgroundColor: "#f0f9ff",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
  },
  timestamp: {
    fontSize: 12,
    color: "#666",
  },
  serviceTitle: {
    fontSize: 14,
    color: "#4f46e5",
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: "#666",
  },
  unreadBadge: {
    position: "absolute",
    right: 0,
    top: 0,
    backgroundColor: "#4f46e5",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  unreadCount: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
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
