import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FadeIn } from "@/components/shared/fade-in";

type Section = "papakū" | "kilo" | "mahina" | "kau";

const SECTIONS: { id: Section; title: string; icon: string; color: string }[] = [
  { id: "papakū", title: "Papakū Makawalu", icon: "grid-outline", color: "#15803D" },
  { id: "kilo", title: "How to Kilo", icon: "eye-outline", color: "#0369A1" },
  { id: "mahina", title: "Mahina Phases", icon: "moon-outline", color: "#7C3AED" },
  { id: "kau", title: "Kau (Seasons)", icon: "sunny-outline", color: "#D97706" },
];

const CONTENT: Record<Section, { intro: string; items: { title: string; desc: string }[]; comingSoon?: boolean }> = {
  papakū: {
    intro:
      "Papakū Makawalu is a Hawaiian framework for understanding the natural world through deep observation. It organizes knowledge into interconnected realms of the environment.",
    items: [],
    comingSoon: true,
  },
  kilo: {
    intro:
      "Kilo means to observe, examine, or forecast. It is the practice of deep, intentional observation of the natural world using all senses.",
    items: [
      {
        title: "Be Present",
        desc: "Find a quiet place outdoors. Sit or stand still. Let your senses open to the environment around you.",
      },
      {
        title: "Observe with All Senses",
        desc: "What do you see? Hear? Smell? Feel on your skin? Notice the wind direction, cloud patterns, birdsong.",
      },
      {
        title: "Internal Weather",
        desc: "Check in with yourself. How do you feel inside? Your moʻolelo (story) is part of the observation.",
      },
      {
        title: "Record Your Observations",
        desc: "Write, draw, or speak your observations. The act of recording deepens awareness and creates a personal archive.",
      },
      {
        title: "Reflect & Connect",
        desc: "How do your observations connect to the larger patterns? What relationships do you notice between elements?",
      },
    ],
  },
  mahina: {
    intro:
      "The Hawaiian lunar calendar (Mahina) guides planting, fishing, and daily activities. Each night of the moon has a name and significance.",
    items: [
      {
        title: "Hilo (Days 1–2)",
        desc: "New crescent moon. A time for new beginnings, planting leafy vegetables. The sea is calm.",
      },
      {
        title: "Hoaka (Day 3)",
        desc: "The crescent grows. Good for planting root crops. Fishing picks up near reefs.",
      },
      {
        title: "Kū (Days 4–6)",
        desc: "Three nights of Kū — excellent for planting and building. Plants grow upright and strong.",
      },
      {
        title: "ʻOle (Days 7–9)",
        desc: "Unproductive days. Rest, reflect, and prepare. Not ideal for planting or fishing.",
      },
      {
        title: "Huna (Day 10)",
        desc: "Hidden moon. Good for planting things that grow underground — taro, sweet potato.",
      },
      {
        title: "Māhealani (Day 14)",
        desc: "Full moon, bright and round. Peak fishing nights. High energy and visibility.",
      },
      {
        title: "Lāʻau (Days 21–22)",
        desc: "Waning moon. Good for harvesting medicines and gathering wood for canoes.",
      },
      {
        title: "Muku (Day 30)",
        desc: "Dark moon, end of cycle. A time of rest and renewal before the new Hilo begins.",
      },
    ],
  },
  kau: {
    intro:
      "Hawaiians recognized seasons (kau) through environmental cues rather than fixed calendar dates. The two primary seasons guide life rhythms.",
    items: [
      {
        title: "Kau Wela (Warm Season)",
        desc: "Roughly May–October. Drier, warmer months. Trade winds blow steadily. Time for open-ocean fishing and outdoor work.",
      },
      {
        title: "Hoʻoilo (Cool Season)",
        desc: "Roughly November–April. Wetter, cooler months with Kona winds. Time for planting, reflection, and ceremony.",
      },
      {
        title: "Makahiki",
        desc: "A season within Hoʻoilo (roughly October–February) dedicated to harvest festival, games, and honoring Lono. Warfare ceased during Makahiki.",
      },
      {
        title: "Environmental Markers",
        desc: "Seasons were identified by the rising of the Pleiades (Makaliʻi), migrating birds, blooming plants, and changing ocean conditions.",
      },
    ],
  },
};

export default function LearnScreen() {
  const [expanded, setExpanded] = useState<Section | null>("papakū");

  const toggle = (id: Section) =>
    setExpanded((prev) => (prev === id ? null : id));

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerClassName="pb-28 pt-8"
    >
      <FadeIn>
        <View className="px-7 pt-16 pb-2">
          <Text
            className="text-3xl text-gray-900 font-bold leading-10"
            style={{ fontFamily: "Newsreader_400Regular" }}
          >
            Learn
          </Text>
          <Text className="text-base text-gray-500 mt-2 leading-6">
            Deepen your understanding of Hawaiian observation practices and
            natural knowledge systems.
          </Text>
          <View className="h-px bg-gray-100 mt-5" />
        </View>
      </FadeIn>

      {SECTIONS.map((section, i) => (
        <FadeIn key={section.id} delay={100 + i * 80}>
          <View className="mx-7 mt-4">
            <TouchableOpacity
              onPress={() => toggle(section.id)}
              activeOpacity={0.7}
              className="flex-row items-center rounded-2xl p-5 bg-gray-50"
              style={{ borderWidth: 1, borderColor: expanded === section.id ? `${section.color}40` : "#E7E5E4" }}
            >
              <View
                className="w-10 h-10 rounded-xl items-center justify-center mr-4"
                style={{ backgroundColor: `${section.color}15` }}
              >
                <Ionicons
                  name={section.icon as keyof typeof Ionicons.glyphMap}
                  size={20}
                  color={section.color}
                />
              </View>
              <Text className="flex-1 text-lg font-bold text-gray-900">
                {section.title}
              </Text>
              <Ionicons
                name={expanded === section.id ? "chevron-up" : "chevron-down"}
                size={20}
                color="#78716C"
              />
            </TouchableOpacity>

            {expanded === section.id && (
              <FadeIn duration={300}>
                <View className="mt-3 px-2">
                  <Text className="text-base text-gray-600 leading-6 mb-4">
                    {CONTENT[section.id].intro}
                  </Text>

                  {CONTENT[section.id].comingSoon && (
                    <View
                      className="mb-3 rounded-xl bg-gray-50 p-5 items-center"
                      style={{ borderWidth: 1, borderColor: "#E7E5E4" }}
                    >
                      <Ionicons name="time-outline" size={24} color={section.color} />
                      <Text className="text-base font-bold text-gray-900 mt-2 mb-1 text-center">
                        Stay Tuned
                      </Text>
                      <Text className="text-sm text-gray-500 leading-5 text-center">
                        We are conducting further research and obtaining proper consent before sharing this resource in our application.
                      </Text>
                    </View>
                  )}

                  {CONTENT[section.id].items.map((item, j) => (
                    <View
                      key={j}
                      className="mb-3 rounded-xl bg-white p-4"
                      style={{
                        borderLeftWidth: 3,
                        borderLeftColor: section.color,
                        borderWidth: 1,
                        borderColor: "#E7E5E4",
                      }}
                    >
                      <Text className="text-base font-bold text-gray-900 mb-1">
                        {item.title}
                      </Text>
                      <Text className="text-sm text-gray-600 leading-5">
                        {item.desc}
                      </Text>
                    </View>
                  ))}
                </View>
              </FadeIn>
            )}
          </View>
        </FadeIn>
      ))}
    </ScrollView>
  );
}
