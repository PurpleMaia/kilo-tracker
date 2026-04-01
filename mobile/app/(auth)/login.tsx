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
} from "react-native";
import { Link, router } from "expo-router";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";

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
        contentContainerClassName="flex-1 justify-center px-6 py-12"
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-3xl font-bold text-gray-900 mb-2">Welcome back</Text>
        <Text className="text-gray-500 mb-8">Sign in to your KILO account</Text>

        {serverError && (
          <View className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
            <Text className="text-red-700 text-sm">{serverError}</Text>
          </View>
        )}

        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-1">Email or Username</Text>
          <TextInput
            className={`border rounded-lg px-4 py-3 text-gray-900 text-base ${
              fieldErrors.identifier ? "border-red-400" : "border-gray-300"
            }`}
            placeholder="Enter email or username"
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            editable={!isSubmitting}
          />
          {fieldErrors.identifier && (
            <Text className="text-red-500 text-xs mt-1">{fieldErrors.identifier}</Text>
          )}
        </View>

        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-700 mb-1">Password</Text>
          <TextInput
            className={`border rounded-lg px-4 py-3 text-gray-900 text-base ${
              fieldErrors.password ? "border-red-400" : "border-gray-300"
            }`}
            placeholder="Enter password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!isSubmitting}
          />
          {fieldErrors.password && (
            <Text className="text-red-500 text-xs mt-1">{fieldErrors.password}</Text>
          )}
        </View>

        <TouchableOpacity
          className={`rounded-lg py-4 items-center ${isSubmitting ? "bg-blue-400" : "bg-blue-600"}`}
          onPress={handleLogin}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold text-base">Sign In</Text>
          )}
        </TouchableOpacity>

        <View className="flex-row justify-center mt-6">
          <Text className="text-gray-500 text-sm">Don't have an account? </Text>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity>
              <Text className="text-blue-600 text-sm font-medium">Sign up</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
