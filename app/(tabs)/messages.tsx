"use client";

import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Platform,
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
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

interface Chat {
  id: string;
  participants: string[];
  participantNames: Record<string, string>;
  participantImages?: Record<string, string>;
  serviceId: string;
  serviceTitle: string;
  lastMessage: string;
  lastMessageTimestamp: any;
  lastMessageSender: string;
  unreadCount?: number;
}

export default function ChatListScreen() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [filteredChats, setFilteredChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();
  const db = getFirestore();

  const fetchChats = useCallback(() => {
    if (!user) return () => {};

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
        setFilteredChats(chatsList);
        setLoading(false);
        setRefreshing(false);
      },
      (error) => {
        console.error("Error fetching chats:", error);
        setLoading(false);
        setRefreshing(false);
      }
    );

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    const unsubscribe = fetchChats();
    return () => unsubscribe && unsubscribe();
  }, [fetchChats]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredChats(chats);
    } else {
      const filtered = chats.filter((chat) => {
        const otherParticipantName =
          getOtherParticipantName(chat).toLowerCase();
        const serviceTitle = chat.serviceTitle.toLowerCase();
        const query = searchQuery.toLowerCase();

        return (
          otherParticipantName.includes(query) || serviceTitle.includes(query)
        );
      });
      setFilteredChats(filtered);
    }
  }, [searchQuery, chats]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchChats();
  };

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

  const getOtherParticipantImage = (chat: Chat) => {
    if (!user) return "https://placeholder.svg?height=50&width=50";
    const otherParticipantId = chat.participants.find((id) => id !== user.uid);
    return otherParticipantId &&
      chat.participantImages &&
      chat.participantImages[otherParticipantId]
      ? chat.participantImages[otherParticipantId]
      : "https://placeholder.svg?height=50&width=50";
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const renderChatItem = ({ item }: { item: Chat }) => {
    const otherParticipantName = getOtherParticipantName(item);
    const recipientId = item.participants.find((id) => id !== user?.uid);
    const isUnread = item.unreadCount && item.unreadCount > 0;
    const isFromMe = item.lastMessageSender === user?.uid;

    return (
      <TouchableOpacity
        style={[styles.chatItem, isUnread && styles.unreadChat]}
        activeOpacity={0.7}
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
        <View style={styles.avatarContainer}>
          {getOtherParticipantImage(item) ===
          "https://placeholder.svg?height=50&width=50" ? (
            <View
              style={[
                styles.initialsAvatar,
                { backgroundColor: getAvatarColor(otherParticipantName) },
              ]}>
              <Text style={styles.initialsText}>
                {getInitials(otherParticipantName)}
              </Text>
            </View>
          ) : (
            <Image
              source={{ uri: getOtherParticipantImage(item) }}
              style={styles.avatar}
            />
          )}
          {item?.unreadCount > 0 && <View style={styles.onlineIndicator} />}
        </View>

        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text
              style={[styles.chatName, isUnread && styles.unreadText]}
              numberOfLines={1}>
              {otherParticipantName}
            </Text>
            <Text style={styles.timestamp}>
              {formatTimestamp(item.lastMessageTimestamp)}
            </Text>
          </View>

          <Text style={styles.serviceTitle} numberOfLines={1}>
            Re: {item.serviceTitle}
          </Text>

          <View style={styles.messagePreviewContainer}>
            {isFromMe && <Text style={styles.youText}>You: </Text>}
            <Text
              style={[styles.lastMessage, isUnread && styles.unreadText]}
              numberOfLines={1}>
              {item.lastMessage}
            </Text>
            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      "#4f46e5",
      "#0ea5e9",
      "#10b981",
      "#f59e0b",
      "#ef4444",
      "#8b5cf6",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    hash = Math.abs(hash);
    return colors[hash % colors.length];
  };

  const renderListHeader = () => (
    <View style={styles.searchContainer}>
      <Feather name="search" size={20} color="#666" style={styles.searchIcon} />
      <TextInput
        style={styles.searchInput}
        placeholder="Search conversations..."
        placeholderTextColor="#999"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      {searchQuery.length > 0 && (
        <TouchableOpacity onPress={() => setSearchQuery("")}>
          <Feather name="x" size={20} color="#666" />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderListEmptyComponent = () => {
    if (searchQuery && filteredChats.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Feather name="search" size={50} color="#ccc" />
          <Text style={styles.emptyText}>No results found</Text>
          <Text style={styles.emptySubtext}>Try a different search term</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Feather name="message-square" size={60} color="#ccc" />
        <Text style={styles.emptyText}>No messages yet</Text>
        <Text style={styles.emptySubtext}>
          Your conversations will appear here
        </Text>
        <TouchableOpacity
          style={styles.newChatButton}
          onPress={() => router.push("/")}>
          <Text style={styles.newChatButtonText}>Browse Services</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={["top"]}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#4f46e5" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity style={styles.headerButton}>
          <Feather name="edit" size={22} color="#333" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredChats}
        renderItem={renderChatItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.chatList,
          filteredChats.length === 0 && styles.emptyList,
        ]}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={renderListEmptyComponent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#4f46e5"]}
            tintColor="#4f46e5"
          />
        }
      />
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
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginVertical: 12,
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
  chatList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  emptyList: {
    flexGrow: 1,
  },
  chatItem: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  unreadChat: {
    backgroundColor: "#f0f7ff",
    borderLeftWidth: 4,
    borderLeftColor: "#4f46e5",
  },
  avatarContainer: {
    position: "relative",
    marginRight: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  initialsAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  initialsText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#4f46e5",
    borderWidth: 2,
    borderColor: "#fff",
  },
  chatInfo: {
    flex: 1,
    justifyContent: "center",
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
    color: "#333",
    flex: 1,
    marginRight: 8,
  },
  unreadText: {
    fontWeight: "700",
    color: "#111",
  },
  timestamp: {
    fontSize: 12,
    color: "#666",
  },
  serviceTitle: {
    fontSize: 14,
    color: "#4f46e5",
    marginBottom: 6,
  },
  messagePreviewContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  youText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  lastMessage: {
    fontSize: 14,
    color: "#666",
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: "#4f46e5",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
    marginLeft: 8,
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
    marginBottom: 24,
  },
  newChatButton: {
    backgroundColor: "#4f46e5",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  newChatButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});
