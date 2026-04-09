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

type RegisterField = {
  label: string;
  value: string;
  setter: (value: string) => void;
  key: keyof z.infer<typeof registerSchema>;
  placeholder: string;
  keyboard?: "default" | "email-address";
  autocap?: "none";
  secure?: boolean;
};

export default function RegisterScreen() {
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fields: RegisterField[] = [
    { label: "Email", value: email, setter: setEmail, key: "email", placeholder: "you@example.com", keyboard: "email-address", autocap: "none" },
    { label: "Username", value: username, setter: setUsername, key: "username", placeholder: "your_username", keyboard: "default", autocap: "none" },
    { label: "Password", value: password, setter: setPassword, key: "password", placeholder: "8+ characters", secure: true },
    { label: "Confirm Password", value: confirmPassword, setter: setConfirmPassword, key: "confirmPassword", placeholder: "Repeat password", secure: true },
  ];

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
      router.replace("/(protected)/onboarding");
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
        contentContainerClassName="flex-grow justify-center px-7 py-12"
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand mark */}
        <View className="items-center mb-8">
          <Image source={brandLogo} className="w-16 h-16 mb-3" resizeMode="contain" />
          <Text className="text-3xl font-bold text-gray-900 tracking-tight">Create account</Text>
          <Text className="text-base text-gray-500 mt-1">Join KILO to start observing</Text>
        </View>

        {serverError && (
          <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
            <Text className="text-red-700 text-base">{serverError}</Text>
          </View>
        )}

        {fields.map(({ label, value, setter, key, placeholder, keyboard, autocap, secure }) => (
          <View key={key} className="mb-4">
            <Text className="text-base font-semibold text-gray-700 mb-1.5">{label}</Text>
            <TextInput
              className={`rounded-xl px-4 py-3.5 text-gray-900 ${
                fieldErrors[key as keyof FieldErrors]
                  ? "border border-red-400 bg-red-50/50"
                  : "border border-gray-200 bg-gray-50"
              }`}
              placeholder={placeholder}
              placeholderTextColor="#9CA3AF"
              value={value}
              onChangeText={setter}
              autoCapitalize={autocap ?? "none"}
              autoCorrect={false}
              keyboardType={keyboard ?? "default"}
              secureTextEntry={secure}
              editable={!isSubmitting}
            />
            {fieldErrors[key as keyof FieldErrors] && (
              <Text className="text-red-500 text-sm mt-1">
                {fieldErrors[key as keyof FieldErrors]}
              </Text>
            )}
          </View>
        ))}

        <TouchableOpacity
          className="rounded-xl py-4 items-center mt-2"
          style={{ backgroundColor: isSubmitting ? "#6EBE80" : "#15803D" }}
          onPress={handleRegister}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-lg">Create Account</Text>
          )}
        </TouchableOpacity>

        <View className="flex-row justify-center mt-6">
          <Text className="text-gray-500 text-base">Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text className="text-base font-bold" style={{ color: "#15803D" }}>Sign in</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
