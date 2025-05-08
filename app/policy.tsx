import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";

export default function PrivacyPolicyScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Privacy Policy</Text>

      <Text style={styles.sectionTitle}>1. Introduction</Text>
      <Text style={styles.text}>
        This Privacy Policy describes how we collect, use, and protect your
        information when you use our app.
      </Text>

      <Text style={styles.sectionTitle}>2. Information We Collect</Text>
      <Text style={styles.text}>
        We may collect the following types of information:
        {"\n"}- Personal Information (name, email)
        {"\n"}- Usage Data (app activity, log data)
        {"\n"}- Device Information (model, OS version)
      </Text>

      <Text style={styles.sectionTitle}>3. How We Use Your Information</Text>
      <Text style={styles.text}>
        We use your information to:
        {"\n"}- Provide and maintain the app
        {"\n"}- Improve user experience
        {"\n"}- Communicate updates and features
        {"\n"}- Ensure security and prevent fraud
      </Text>

      <Text style={styles.sectionTitle}>4. Data Sharing</Text>
      <Text style={styles.text}>
        We do not sell or rent your personal information. We may share data with
        trusted service providers who help us operate our app.
      </Text>

      <Text style={styles.sectionTitle}>5. Your Rights</Text>
      <Text style={styles.text}>
        You may have the right to:
        {"\n"}- Access, update, or delete your information
        {"\n"}- Withdraw consent
        {"\n"}- Contact us about any concerns regarding your privacy
      </Text>

      <Text style={styles.sectionTitle}>6. Security</Text>
      <Text style={styles.text}>
        We use industry-standard methods to protect your information. However,
        no method is 100% secure.
      </Text>

      <Text style={styles.sectionTitle}>7. Changes to This Policy</Text>
      <Text style={styles.text}>
        We may update this policy from time to time. You will be notified of
        major changes through the app.
      </Text>

      <Text style={styles.sectionTitle}>8. Contact Us</Text>
      <Text style={styles.text}>
        If you have questions or concerns, please contact us at:{"\n"}
        support@example.com
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#fff",
    flexGrow: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
    color: "#333",
  },
});
