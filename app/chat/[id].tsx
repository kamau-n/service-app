"use client";

import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
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
} from "firebase/firestore";
import { useLocalSearchParams } from "expo-router";
import { useAuth } from "@/context/auth-context";
import { formatTimestamp } from "@/utils/format-date";

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: any;
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const chatId = params.id as string;
  const recipientId = params.recipientId as string;
  const db = getFirestore();
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!chatId) return;

    const messagesRef = collection(db, "chats", chatId, "messages");
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

        // Scroll to bottom when new messages arrive
        if (messagesList.length > 0) {
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      },
      (error) => {
        console.error("Error fetching messages:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [chatId]);

  const sendMessage = async () => {
    if (!inputText.trim() || !user || !chatId) return;

    try {
      setSending(true);
      const messageText = inputText.trim();
      setInputText("");

      // Add message to subcollection
      const messagesRef = collection(db, "chats", chatId, "messages");
      await addDoc(messagesRef, {
        text: messageText,
        senderId: user.uid,
        timestamp: serverTimestamp(),
      });

      // Update chat document with last message
      const chatRef = doc(db, "chats", chatId);
      await updateDoc(chatRef, {
        lastMessage: messageText,
        lastMessageTimestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isCurrentUser = item.senderId === user?.uid;

    return (
      <View
        style={[
          styles.messageContainer,
          isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage,
        ]}>
        <View
          style={[
            styles.messageBubble,
            isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
          ]}>
          <Text
            style={[
              styles.messageText,
              isCurrentUser ? styles.currentUserText : styles.otherUserText,
            ]}>
            {item.text}
          </Text>
        </View>
        <Text style={styles.messageTime}>
          {formatTimestamp(item.timestamp)}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
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
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            !inputText.trim() && styles.disabledButton,
          ]}
          onPress={sendMessage}
          disabled={!inputText.trim() || sending}>
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Feather name="send" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 16,
    maxWidth: "80%",
  },
  currentUserMessage: {
    alignSelf: "flex-end",
  },
  otherUserMessage: {
    alignSelf: "flex-start",
  },
  messageBubble: {
    borderRadius: 16,
    padding: 12,
  },
  currentUserBubble: {
    backgroundColor: "#4f46e5",
  },
  otherUserBubble: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
  },
  messageText: {
    fontSize: 16,
  },
  currentUserText: {
    color: "#fff",
  },
  otherUserText: {
    color: "#333",
  },
  messageTime: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: "row",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    backgroundColor: "#f0f2f5",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: "#4f46e5",
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#a5b4fc",
  },
});
