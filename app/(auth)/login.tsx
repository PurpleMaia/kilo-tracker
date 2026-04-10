import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from "react-native";
import { Link, router } from "expo-router";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";

const brandLogo = require("../../assets/icon.png");

const loginSchema = z.object({
  identifier: z.string().min(1, "Email or username is required"),
  password: z.string().min(1, "Password is required"),
});

type FieldErrors = Partial<Record<keyof z.infer<typeof loginSchema>, string>>;

export default function LoginScreen() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    setServerError(null);
    setFieldErrors({});

    const parsed = loginSchema.safeParse({ identifier, password });
    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FieldErrors;
        if (!errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      await login(parsed.data.identifier, parsed.data.password);
      router.replace("/(protected)");
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerClassName="flex-1 justify-center px-7 py-12"
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand mark */}
        <View className="items-center mb-10">
          <Image source={brandLogo} className="w-16 h-16 mb-3" resizeMode="contain" />
          <Text className="text-3xl font-bold text-gray-900 tracking-tight">KILO</Text>
          <Text className="text-base text-gray-500 mt-1">Aloha. Pilina. Hulihia.</Text>
        </View>

        {serverError && (
          <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
            <Text className="text-red-700 text-base">{serverError}</Text>
          </View>
        )}

        <View className="mb-4">
          <Text className="text-base font-semibold text-gray-700 mb-1.5">Email or Username</Text>
          <TextInput
            className={`rounded-xl px-4 py-3 text-gray-900 ${
              fieldErrors.identifier
                ? "border border-red-400 bg-red-50/50"
                : "border border-gray-200 bg-gray-50"
            }`}
            placeholder="Enter email or username"
            placeholderTextColor="#9CA3AF"
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            editable={!isSubmitting}
            
          />
          {fieldErrors.identifier && (
            <Text className="text-red-500 text-sm mt-1">{fieldErrors.identifier}</Text>
          )}
        </View>

        <View className="mb-6">
          <Text className="text-base font-semibold text-gray-700 mb-1.5">Password</Text>
          <TextInput
            className={`rounded-xl px-4 py-3 text-gray-900 ${
              fieldErrors.password
                ? "border border-red-400 bg-red-50/50"
                : "border border-gray-200 bg-gray-50"
            }`}
            placeholder="Enter password"
            placeholderTextColor="#9CA3AF"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!isSubmitting}
          />
          {fieldErrors.password && (
            <Text className="text-red-500 text-sm mt-1">{fieldErrors.password}</Text>
          )}
        </View>

        <TouchableOpacity
          className="rounded-xl py-4 items-center"
          style={{ backgroundColor: isSubmitting ? "#6EBE80" : "#15803D" }}
          onPress={handleLogin}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-lg">Sign In</Text>
          )}
        </TouchableOpacity>

        <View className="flex-row justify-center mt-6">
          <Text className="text-gray-500 text-base">Don't have an account? </Text>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity>
              <Text className="text-base font-bold" style={{ color: "#15803D" }}>Sign up</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
