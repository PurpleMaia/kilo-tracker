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

const registerSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers, and underscores only"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type FieldErrors = Partial<Record<keyof z.infer<typeof registerSchema>, string>>;

export default function RegisterScreen() {
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async () => {
    setServerError(null);
    setFieldErrors({});

    const parsed = registerSchema.safeParse({ email, username, password, confirmPassword });
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
      await register(parsed.data.email, parsed.data.username, parsed.data.password);
      router.replace("/(protected)");
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Registration failed");
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
        contentContainerClassName="flex-grow justify-center px-6 py-12"
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-3xl font-bold text-gray-900 mb-2">Create account</Text>
        <Text className="text-gray-500 mb-8">Join KILO to start tracking</Text>

        {serverError && (
          <View className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
            <Text className="text-red-700 text-sm">{serverError}</Text>
          </View>
        )}

        {(
          [
            { label: "Email", value: email, setter: setEmail, key: "email", placeholder: "you@example.com", keyboard: "email-address" as const, autocap: "none" as const },
            { label: "Username", value: username, setter: setUsername, key: "username", placeholder: "your_username", keyboard: "default" as const, autocap: "none" as const },
            { label: "Password", value: password, setter: setPassword, key: "password", placeholder: "8+ characters", secure: true },
            { label: "Confirm Password", value: confirmPassword, setter: setConfirmPassword, key: "confirmPassword", placeholder: "Repeat password", secure: true },
          ] as const
        ).map(({ label, value, setter, key, placeholder, keyboard, autocap, secure }) => (
          <View key={key} className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-1">{label}</Text>
            <TextInput
              className={`border rounded-lg px-4 py-3 text-gray-900 text-base ${
                fieldErrors[key as keyof FieldErrors] ? "border-red-400" : "border-gray-300"
              }`}
              placeholder={placeholder}
              value={value}
              onChangeText={setter}
              autoCapitalize={autocap ?? "none"}
              autoCorrect={false}
              keyboardType={keyboard ?? "default"}
              secureTextEntry={secure}
              editable={!isSubmitting}
            />
            {fieldErrors[key as keyof FieldErrors] && (
              <Text className="text-red-500 text-xs mt-1">
                {fieldErrors[key as keyof FieldErrors]}
              </Text>
            )}
          </View>
        ))}

        <TouchableOpacity
          className={`rounded-lg py-4 items-center mt-2 ${isSubmitting ? "bg-blue-400" : "bg-blue-600"}`}
          onPress={handleRegister}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold text-base">Create Account</Text>
          )}
        </TouchableOpacity>

        <View className="flex-row justify-center mt-6">
          <Text className="text-gray-500 text-sm">Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text className="text-blue-600 text-sm font-medium">Sign in</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
