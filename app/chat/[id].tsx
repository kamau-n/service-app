"use client";

import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { useAuth } from "@/context/auth-context";
import { StatusBar } from "expo-status-bar";

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: any;
  read?: boolean;
}

interface ChatDetails {
  serviceId: string;
  serviceTitle: string;
  participantNames: Record<string, string>;
  participantImages?: Record<string, string>;
}

export default function ChatScreen() {
  const { id, name, recipientId } = useLocalSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [chatDetails, setChatDetails] = useState<ChatDetails | null>(null);
  const { user } = useAuth();
  const db = getFirestore();
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!id || !user) return;

    // Fetch chat details
    const fetchChatDetails = async () => {
      try {
        const chatDoc = await getDoc(doc(db, "chats", id as string));
        if (chatDoc.exists()) {
          setChatDetails(chatDoc.data() as ChatDetails);
        }
      } catch (error) {
        console.error("Error fetching chat details:", error);
      }
    };

    fetchChatDetails();

    // Subscribe to messages in subcollection
    const messagesRef = collection(db, "chats", id as string, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const messagesList: Message[] = [];
        snapshot.forEach((doc) => {
          messagesList.push({ id: doc.id, ...doc.data() } as Message);
        });
        setMessages(messagesList);
        setLoading(false);

        // Mark messages as read
        messagesList.forEach(async (message) => {
          if (message.senderId !== user.uid && !message.read) {
            try {
              await updateDoc(
                doc(db, "chats", id as string, "messages", message.id),
                {
                  read: true,
                }
              );
            } catch (error) {
              console.error("Error marking message as read:", error);
            }
          }
        });
      },
      (error) => {
        console.error("Error fetching messages:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [id, user]);

  const sendMessage = async () => {
    if (!inputText.trim() || !user || !id || !recipientId) return;

    try {
      setSending(true);
      Keyboard.dismiss();
      const messageText = inputText.trim();
      setInputText("");

      // Add message to subcollection
      const messagesRef = collection(db, "chats", id as string, "messages");
      await addDoc(messagesRef, {
        text: messageText,
        senderId: user.uid,
        timestamp: serverTimestamp(),
        read: false,
      });

      // Update chat document with last message
      const chatRef = doc(db, "chats", id as string);
      await updateDoc(chatRef, {
        lastMessage: messageText,
        lastMessageSender: user.uid,
        lastMessageTimestamp: serverTimestamp(),
        read: false,
        unreadCount: increment(recipientId as string),
      });
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  const increment = (recipientId: string) => {
    return {
      [`unreadCounts.${recipientId}`]: 1,
    };
  };

  const formatMessageDate = (timestamp: any) => {
    if (!timestamp) return "";

    const date = timestamp.toDate();
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
    }
  };

  const formatMessageTime = (timestamp: any) => {
    if (!timestamp) return "";
    return timestamp.toDate().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const shouldShowTimestamp = (index: number) => {
    if (index === 0) return true;

    const currentMessage = messages[index];
    const previousMessage = messages[index - 1];

    if (!currentMessage.timestamp || !previousMessage.timestamp) return false;

    const currentDate = new Date(currentMessage.timestamp.toDate());
    const previousDate = new Date(previousMessage.timestamp.toDate());

    return (
      currentDate.getDate() !== previousDate.getDate() ||
      currentDate.getMonth() !== previousDate.getMonth() ||
      currentDate.getFullYear() !== previousDate.getFullYear()
    );
  };

  const shouldShowAvatar = (index: number) => {
    if (index === 0) return true;
    if (index === messages.length - 1) return true;

    const currentMessage = messages[index];
    const previousMessage = messages[index - 1];
    const nextMessage = messages[index + 1];

    // Show avatar if previous message is from a different sender
    if (currentMessage.senderId !== previousMessage.senderId) return true;

    // Show avatar if next message is from a different sender
    if (currentMessage.senderId !== nextMessage.senderId) return true;

    // Show avatar if there's a significant time gap (e.g., 5 minutes)
    if (
      currentMessage.timestamp &&
      previousMessage.timestamp &&
      Math.abs(
        currentMessage.timestamp.toDate().getTime() -
          previousMessage.timestamp.toDate().getTime()
      ) >
        5 * 60 * 1000
    ) {
      return true;
    }

    return false;
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
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

  const renderMessageItem = ({
    item,
    index,
  }: {
    item: Message;
    index: number;
  }) => {
    const isFromMe = item.senderId === user?.uid;
    const showTimestamp = shouldShowTimestamp(index);
    const showAvatar = !isFromMe && shouldShowAvatar(index);

    return (
      <View style={styles.messageContainer}>
        {showTimestamp && (
          <View style={styles.timestampContainer}>
            <Text style={styles.timestampText}>
              {formatMessageDate(item.timestamp)}
            </Text>
          </View>
        )}

        <View style={[styles.messageRow, isFromMe && styles.messageRowReverse]}>
          {!isFromMe && showAvatar && (
            <View style={styles.messageSenderAvatar}>
              {chatDetails?.participantImages?.[item.senderId] ? (
                <Image
                  source={{ uri: chatDetails.participantImages[item.senderId] }}
                  style={styles.senderAvatar}
                />
              ) : (
                <View
                  style={[
                    styles.initialsAvatar,
                    {
                      backgroundColor: getAvatarColor(
                        chatDetails?.participantNames?.[item.senderId] || ""
                      ),
                    },
                  ]}>
                  <Text style={styles.initialsText}>
                    {getInitials(
                      chatDetails?.participantNames?.[item.senderId] || ""
                    )}
                  </Text>
                </View>
              )}
            </View>
          )}

          {!isFromMe && !showAvatar && <View style={styles.avatarSpacer} />}

          <View
            style={[
              styles.messageBubble,
              isFromMe ? styles.myMessageBubble : styles.theirMessageBubble,
              !showAvatar && !isFromMe && styles.consecutiveMessage,
            ]}>
            <Text
              style={[styles.messageText, isFromMe && styles.myMessageText]}>
              {item.text}
            </Text>
            <Text
              style={[styles.messageTime, isFromMe && styles.myMessageTime]}>
              {formatMessageTime(item.timestamp)}
              {isFromMe && (
                <Text style={styles.readStatus}>
                  {item.read ? " • Read" : ""}
                </Text>
              )}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerProfile}
          onPress={() => {
            // Navigate to provider profile
            if (recipientId) {
              router.push(`/provider/${recipientId}`);
            }
          }}>
          {chatDetails?.participantImages?.[recipientId as string] ? (
            <Image
              source={{
                uri: chatDetails.participantImages[recipientId as string],
              }}
              style={styles.headerAvatar}
            />
          ) : (
            <View
              style={[
                styles.headerInitialsAvatar,
                { backgroundColor: getAvatarColor(name as string) },
              ]}>
              <Text style={styles.headerInitialsText}>
                {getInitials(name as string)}
              </Text>
            </View>
          )}

          <View style={styles.headerInfo}>
            <Text style={styles.headerName} numberOfLines={1}>
              {name}
            </Text>
            {chatDetails && (
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {chatDetails.serviceTitle}
              </Text>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerButton}>
          <Feather name="more-vertical" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4f46e5" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessageItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            inverted={false}
            onContentSizeChange={() => {
              if (messages.length > 0) {
                flatListRef.current?.scrollToEnd({ animated: true });
              }
            }}
            onLayout={() => {
              if (messages.length > 0) {
                flatListRef.current?.scrollToEnd({ animated: false });
              }
            }}
          />
        )}

        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachButton}>
            <Feather name="plus" size={24} color="#4f46e5" />
          </TouchableOpacity>

          <View style={styles.textInputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor="#999"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.sendButton,
              !inputText.trim() && styles.sendButtonDisabled,
            ]}
            disabled={!inputText.trim() || sending}
            onPress={sendMessage}>
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Feather name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    backgroundColor: "#fff",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerProfile: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerInitialsAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerInitialsText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  headerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#666",
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    marginBottom: 8,
  },
  timestampContainer: {
    alignItems: "center",
    marginVertical: 16,
  },
  timestampText: {
    fontSize: 12,
    color: "#666",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: "hidden",
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 2,
  },
  messageRowReverse: {
    flexDirection: "row-reverse",
  },
  messageSenderAvatar: {
    marginRight: 8,
    alignSelf: "flex-end",
  },
  avatarSpacer: {
    width: 36,
    marginRight: 8,
  },
  senderAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  initialsAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  initialsText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  messageBubble: {
    maxWidth: "75%",
    padding: 12,
    borderRadius: 18,
    marginBottom: 2,
  },
  myMessageBubble: {
    backgroundColor: "#4f46e5",
    borderBottomRightRadius: 4,
  },
  theirMessageBubble: {
    backgroundColor: "#f0f0f0",
    borderBottomLeftRadius: 4,
  },
  consecutiveMessage: {
    marginLeft: 36,
  },
  messageText: {
    fontSize: 16,
    color: "#333",
    marginBottom: 4,
  },
  myMessageText: {
    color: "#fff",
  },
  messageTime: {
    fontSize: 11,
    color: "#666",
    alignSelf: "flex-end",
  },
  myMessageTime: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  readStatus: {
    fontSize: 11,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    backgroundColor: "#fff",
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
  },
  textInputContainer: {
    flex: 1,
    marginHorizontal: 8,
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 8 : 0,
  },
  input: {
    fontSize: 16,
    color: "#333",
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#4f46e5",
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#a5a5a5",
  },
});
