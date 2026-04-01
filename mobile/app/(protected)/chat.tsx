import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function ChatScreen() {
  return (
    <View className="flex-1 bg-koa-bg items-center justify-center px-10">
      <Ionicons name="chatbubble-outline" size={40} color="#B0A48E" />
      <Text
        className="text-xl text-koa-sand mt-4 text-center"
        style={{ fontFamily: "Newsreader_400Regular" }}
      >
        Coming Soon
      </Text>
      <Text className="text-sm text-koa-stone mt-2 text-center leading-5">
        Reflect on your observations with an AI companion rooted in Hawaiian
        wisdom.
      </Text>
    </View>
  );
}
