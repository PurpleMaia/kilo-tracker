import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    if (__DEV__) console.error("ErrorBoundary caught:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff", padding: 32 }}>
          <View style={{
            width: 56, height: 56, borderRadius: 16,
            backgroundColor: "#FEF2F2", alignItems: "center", justifyContent: "center", marginBottom: 16,
          }}>
            <Ionicons name="warning-outline" size={28} color="#B91C1C" />
          </View>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#1C1917", marginBottom: 8 }}>
            Something went wrong
          </Text>
          <Text style={{ fontSize: 14, color: "#78716C", textAlign: "center", lineHeight: 20, marginBottom: 24 }}>
            The app ran into an unexpected error. Try again below.
          </Text>
          <TouchableOpacity
            onPress={() => this.setState({ hasError: false })}
            activeOpacity={0.8}
            style={{
              backgroundColor: "#15803D", borderRadius: 12,
              paddingHorizontal: 24, paddingVertical: 14,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}
