import { useState, useRef } from "react";
import { View, Text, ScrollView, TouchableOpacity, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FadeIn } from "@/components/shared/fade-in";

type Section = "papakū" | "kilo" | "mahina" | "kau";

const SECTIONS: { id: Section; title: string; subtitle: string; icon: string; color: string }[] = [
  { id: "papakū", title: "Papakū Makawalu", subtitle: "Hawaiian worldview framework", icon: "grid-outline", color: "#15803D" },
  { id: "kilo", title: "Kilo", subtitle: "Practice of deep observation and acknowledgment", icon: "eye-outline", color: "#0369A1" },
  { id: "mahina", title: "Kaulana Mahina", subtitle: "Hawaiian lunar calendar", icon: "moon-outline", color: "#7C3AED" },
  { id: "kau", title: "Kau", subtitle: "Two primary seasons", icon: "sunny-outline", color: "#D97706" },
];

// ── Papakū content ──────────────────────────────────────────────────
const PAPAKU_INTRO =
  "Papakū Makawalu is a framework used to observe, understand, analyze, and attune to the natural environment. It is the ability to categorize and connect all systems within the universe between three houses of knowledge.";

const PAPAKU_ITEMS: { title: string; hawaiian: string; desc: string; guidance: string; icon: string }[] = [
  {
    title: "The Heavens",
    hawaiian: "Papahulilani",
    desc: "The heavens, stars, weather, and celestial bodies. It includes the sun, moon, clouds, rain, winds, and all phenomena in the sky.",
    guidance: "In your kilo, look for different cloud colors and shapes, where the sun or moon rises, wind & rain strength and directions, and even shadows cast by the sun.",
    icon: "star-outline",
  },
  {
    title: "The Earth & Ocean",
    hawaiian: "Papahulihonua",
    desc: "The systems of the earth and ocean. It is the study of the movement, development, and transformations of the natural earth and oceans.",
    guidance: "Try and observe the differences between the kau wela and hoʻoilo seasons. Kilo soil, rock types, the mountains, valleys, beaches, currents, waves, freshwater sources, etc.",
    icon: "earth-outline",
  },
  {
    title: "Living Systems",
    hawaiian: "Papahānaumoku",
    desc: "The living systems of plants, animals, and people. It is the study of the life cycle of all beings that reproduce.",
    guidance: "Try and observe the differences between the kau wela and hoʻoilo seasons. Kilo plants, trees, birds, insects, fish, and people around you. Notice how they interact with each other and their environment and how the natural environment influences them.",
    icon: "leaf-outline",
  },
];

// ── Kilo steps ──────────────────────────────────────────────────────
const KILO_INTRO =
  "Kilo means to not only observe, examine, or forecast but to also acknowledge the environment around you. It is the practice of deep, intentional observation of the natural world using all senses. It is a way to see a place as a living and breathing entity with its own moʻolelo (story) and relationships. Kilo also helps inform decisions about planting, fishing, and daily activities based on the current conditions and patterns.";

const KILO_STEPS: { title: string; desc: string; icon: string }[] = [
  { title: "Be Present", desc: "Find a quiet place outdoors. Sit or stand still. Let your senses open to the environment around you.", icon: "body-outline" },
  { title: "Observe with All Senses", desc: "What do you see? Hear? Smell? Feel on your skin? Notice the wind direction, cloud patterns, birdsong.", icon: "hand-left-outline" },
  { title: "Internal Weather", desc: "Check in with yourself. How do you feel inside? Your moʻolelo (story) is part of the observation.", icon: "heart-outline" },
  { title: "Record Your Observations", desc: "Write, draw, or speak your observations. The act of recording deepens awareness and creates a personal archive. This app helps organize your kilo speaker/written notes by date and themes for future reflection.", icon: "create-outline" },
  { title: "Reflect & Connect", desc: "How do your observations connect to the larger patterns? What relationships do you notice between the three houses of knowledge (Papahulilani, Papahulihonua, Papahānaumoku)?", icon: "git-merge-outline" },
];

// ── Mahina phases ───────────────────────────────────────────────────
const MAHINA_INTRO =
  "The moon (mahina and personified as the goddess Hina) is a powerful force in Hawaiian culture, influencing everything from planting and fishing to navigation and spirituality. Our kūpuna were able to develop strategies to maximize their resources and live in harmony with the natural rhythms of the environment. The moon phases are categorized by anahulu (ten-Night periods) that reflect the moon's characteristics (waxing, full moons, waning), with each anahulu correlating to a characteristic of resource management.";

type Anahulu = "Hoʻonui" | "Poepoe" | "Emi";

const ANAHULU_META: Record<Anahulu, { label: string; desc: string; color: string; bg: string }> = {
  "Hoʻonui": { label: "Hoʻonui", desc: "Waxing — growth period", color: "#15803D", bg: "#F0FDF4" },
  "Poepoe":  { label: "Poepoe",  desc: "Full — peak period",     color: "#D97706", bg: "#FFFBEB" },
  "Emi":     { label: "Emi",     desc: "Waning — rest period",    color: "#7C3AED", bg: "#F5F3FF" },
};

type MahinaPhase = { title: string; night: string; desc: string; anahulu: Anahulu };

const MAHINA_PHASES: MahinaPhase[] = [
  { title: "Hilo",      night: "Night 1",     desc: "New crescent moon. Mark of the first anahulu.", anahulu: "Hoʻonui" },
  { title: "Hoaka",     night: "Night 2",     desc: "The crescent grows.", anahulu: "Hoʻonui" },
  { title: "Kū",        night: "Nights 3–6",  desc: "Three nights of Kū, excellent for planting and building. Plants grow upright and strong.", anahulu: "Hoʻonui" },
  { title: "ʻOle",      night: "Nights 7–10", desc: "Unproductive nights. Rest, reflect, and prepare. Not ideal for planting or fishing.", anahulu: "Hoʻonui" },
  { title: "Huna",      night: "Night 1",     desc: "Hidden moon. Good for planting things that grow underground.", anahulu: "Poepoe" },
  { title: "Mōhalu",    night: "Night 2",     desc: "Believed to be a good time to plant flowers to be round and perfect like the moon on this night.", anahulu: "Poepoe" },
  { title: "Hua",       night: "Night 3",     desc: "Meaning \"fruit\" or \"offspring\". A time for planting and nurturing.", anahulu: "Poepoe" },
  { title: "Akua",      night: "Night 4",     desc: "First full moon night.", anahulu: "Poepoe" },
  { title: "Hoku",      night: "Night 5",     desc: "Fullest moon. Bright and round. Peak fishing nights. High energy and visibility.", anahulu: "Poepoe" },
  { title: "Māhealani", night: "Night 6",     desc: "Full moon, bright and round. Peak fishing nights. High energy and visibility.", anahulu: "Poepoe" },
  { title: "Kulu",      night: "Night 7",     desc: "Full moon, bright and round. Peak fishing nights. High energy and visibility.", anahulu: "Poepoe" },
  { title: "Lāʻau",     night: "Nights 8–10", desc: "Waning moon. Good for harvesting medicines and gathering wood for canoes.", anahulu: "Poepoe" },
  { title: "ʻOle",      night: "Nights 1–3",  desc: "Unproductive nights. Rest, reflect, and prepare. Not ideal for planting or fishing.", anahulu: "Emi" },
  { title: "Kaloa",     night: "Nights 4–6",  desc: "Nights spent worshiping the god Kanaloa, only certain crops were planted and certain kinds of fishing were practiced.", anahulu: "Emi" },
  { title: "Kāne",      night: "Night 7",     desc: "Nights spent worshiping the god Kāne. Fishing and planting were restricted.", anahulu: "Emi" },
  { title: "Lono",      night: "Night 8",     desc: "Night spent worshiping the god Lono. Food was offered to both Kāne & Lono.", anahulu: "Emi" },
  { title: "Mauli",     night: "Night 9",     desc: "Second to last moon cycle.", anahulu: "Emi" },
  { title: "Muku",      night: "Night 10",    desc: "Dark moon, end of cycle. A time of rest and renewal before the new Hilo begins.", anahulu: "Emi" },
];

// ── Kau seasons ─────────────────────────────────────────────────────
const KAU_INTRO =
  "Hawaiians recognized seasons through environmental cues rather than fixed calendar dates. The two primary seasons guide life rhythms.";

const KAU_SEASONS: { title: string; months: string; desc: string; icon: string; color: string; bg: string }[] = [
  {
    title: "Kau Wela",
    months: "May – October",
    desc: "Drier, warmer months. Longer days bring more sunlight. Trade winds cool the islands. Time for deep-sea fishing and dryland farming.",
    icon: "sunny-outline",
    color: "#EA580C",
    bg: "#FFF7ED",
  },
  {
    title: "Hoʻoilo",
    months: "November – April",
    desc: "Wetter, cooler months with Kona winds. Rains replenish streams and taro patches. Surf rises on north shores. Time for upland planting.",
    icon: "rainy-outline",
    color: "#0369A1",
    bg: "#F0F9FF",
  },
];

// ═══════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════

export default function LearnScreen() {
  const [active, setActive] = useState<Section>("papakū");
  const { width } = useWindowDimensions();
  const cardWidth = (width - 56 - 12) / 2; // px-7 each side + gap
  const contentScrollRef = useRef<ScrollView>(null);

  const activeSection = SECTIONS.find((s) => s.id === active)!;

  const switchTab = (id: Section) => {
    setActive(id);
    contentScrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  return (
    <View className="flex-1 bg-white">
      {/* ── Header + Tabs (fixed) ──────────────────────────────── */}
      <FadeIn>
        <View className="px-7 pt-24 pb-1">
          <Text
            className="text-3xl text-gray-900 font-bold leading-10"
            style={{ fontFamily: "Newsreader_400Regular" }}
          >
            Learn
          </Text>
          <Text className="text-base text-gray-500 mt-2 leading-6">
            Deepen your understanding of Hawaiian observation practices and
            indigenous knowledge systems.
          </Text>
        </View>
      </FadeIn>

      {/* ── Tab bar ────────────────────────────────────────────── */}
      <FadeIn delay={100}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="px-7 py-4"
          className="flex-grow-0"
        >
          {SECTIONS.map((section) => {
            const isActive = active === section.id;
            return (
              <TouchableOpacity
                key={section.id}
                onPress={() => switchTab(section.id)}
                activeOpacity={0.7}
                className="flex-row items-center rounded-full mr-2.5 px-4 py-2.5"
                style={{
                  backgroundColor: isActive ? `${section.color}12` : "#F5F5F4",
                  borderWidth: 1,
                  borderColor: isActive ? `${section.color}35` : "#E7E5E4",
                }}
              >
                <Ionicons
                  name={section.icon as keyof typeof Ionicons.glyphMap}
                  size={16}
                  color={isActive ? section.color : "#A8A29E"}
                />
                <Text
                  className="text-sm font-semibold ml-2"
                  style={{ color: isActive ? section.color : "#78716C" }}
                >
                  {section.id === "papakū" ? "Papakū Makawalu" : section.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </FadeIn>

      <View className="h-px bg-gray-100 mx-7" />

      {/* ── Tab content ────────────────────────────────────────── */}
      <ScrollView
        ref={contentScrollRef}
        className="flex-1"
        contentContainerClassName="pb-28"
        showsVerticalScrollIndicator={false}
      >
        {/* Section title + content — key forces remount & fade on tab switch */}
        <FadeIn key={active} duration={300}>
          {/* Section title area */}
          <View className="px-7 pt-5 pb-1">
            <View className="flex-row items-center mb-2">
              <View
                className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                style={{ backgroundColor: `${activeSection.color}12` }}
              >
                <Ionicons
                  name={activeSection.icon as keyof typeof Ionicons.glyphMap}
                  size={20}
                  color={activeSection.color}
                />
              </View>
              <View>
                <Text className="text-xl font-bold text-gray-900">
                  {activeSection.title}
                </Text>
                <Text className="text-xs text-gray-400 mt-0.5">
                  {activeSection.subtitle}
                </Text>
              </View>
            </View>
          </View>

          {/* Section-specific content */}
          <View className="px-7 pt-3">
            {active === "papakū" && <PapakuContent />}
            {active === "kilo" && <KiloContent />}
            {active === "mahina" && <MahinaContent />}
            {active === "kau" && <KauContent cardWidth={cardWidth} />}
          </View>
        </FadeIn>

        {/* ── Acknowledgments ──────────────────────────────────── */}
        <View className="mx-7 mt-10 mb-4">
          <View className="h-px bg-gray-100 mb-6" />
          <View className="flex-row items-center mb-3">
            <Ionicons name="heart" size={14} color="#A8A29E" />
            <Text className="text-xs font-bold text-gray-400 ml-1.5 tracking-widest uppercase">
              Acknowledgments
            </Text>
          </View>
          <Text className="text-sm text-gray-500 leading-6">
            The knowledge shared on this page is rooted in Hawaiian cultural
            practices passed down through generations of kumu and
            practitioners. We honor the Edith Kanakaʻole Foundation for their
            work in preserving and teaching Papakū Makawalu, and all kumu and
            cultural practitioners who continue to share this ʻike.
          </Text>
          <Text className="text-sm text-gray-400 leading-6 mt-3" style={{ fontFamily: "Newsreader_400Regular_Italic" }}>
            This content is shared with respect and the intent to support
            learning. If you are a practitioner and would like to contribute or
            suggest corrections, please reach out to our team at the Purple Maiʻa Foundation.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Section-specific components
// ═══════════════════════════════════════════════════════════════════

/** Papakū — three houses with guidance callouts */
function PapakuContent() {
  return (
    <>
      <Text className="text-base text-gray-600 leading-7 mb-6">
        {PAPAKU_INTRO}
      </Text>

      {PAPAKU_ITEMS.map((item, j) => (
        <View
          key={j}
          className="mb-4 rounded-2xl bg-white overflow-hidden"
          style={{ borderWidth: 1, borderColor: "#E7E5E4" }}
        >
          {/* Card header */}
          <View
            className="flex-row items-center px-5 py-4"
            style={{ backgroundColor: "#15803D08" }}
          >
            <View
              className="w-9 h-9 rounded-lg items-center justify-center mr-3"
              style={{ backgroundColor: "#15803D15" }}
            >
              <Ionicons
                name={item.icon as keyof typeof Ionicons.glyphMap}
                size={18}
                color="#15803D"
              />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-gray-900">
                {item.hawaiian}
              </Text>
              <Text className="text-xs text-gray-400 mt-0.5">
                {item.title}
              </Text>
            </View>
          </View>

          {/* Description */}
          <View className="px-5 pt-3 pb-4">
            <Text className="text-sm text-gray-600 leading-6">
              {item.desc}
            </Text>

            {/* Guidance callout */}
            <View
              className="mt-3 rounded-xl px-4 py-3 flex-row"
              style={{ backgroundColor: "#F0FDF4" }}
            >
              <Ionicons name="eye-outline" size={15} color="#15803D" style={{ marginTop: 2 }} />
              <Text className="text-sm text-green-800 leading-6 ml-2.5 flex-1" style={{ fontFamily: "Newsreader_400Regular_Italic" }}>
                {item.guidance}
              </Text>
            </View>
          </View>
        </View>
      ))}
    </>
  );
}

/** Kilo — numbered steps with connecting line */
function KiloContent() {
  return (
    <>
      <Text className="text-base text-gray-600 leading-7 mb-6">
        {KILO_INTRO}
      </Text>

      {KILO_STEPS.map((step, j) => (
        <View key={j} className="flex-row mb-1">
          {/* Step indicator column */}
          <View className="items-center mr-4" style={{ width: 36 }}>
            <View
              className="w-9 h-9 rounded-full items-center justify-center"
              style={{ backgroundColor: "#0369A115" }}
            >
              <Text className="text-sm font-bold" style={{ color: "#0369A1" }}>
                {j + 1}
              </Text>
            </View>
            {/* Connecting line */}
            {j < KILO_STEPS.length - 1 && (
              <View
                className="flex-1"
                style={{ width: 2, backgroundColor: "#0369A115", minHeight: 24 }}
              />
            )}
          </View>

          {/* Step content */}
          <View className="flex-1 pb-5">
            <View className="flex-row items-center mb-1.5">
              <Ionicons
                name={step.icon as keyof typeof Ionicons.glyphMap}
                size={15}
                color="#0369A1"
              />
              <Text className="text-base font-bold text-gray-900 ml-2">
                {step.title}
              </Text>
            </View>
            <Text className="text-sm text-gray-600 leading-6">
              {step.desc}
            </Text>
          </View>
        </View>
      ))}
    </>
  );
}

/** Mahina — grouped by anahulu with color-coded phases */
function MahinaContent() {
  const anahulus: Anahulu[] = ["Hoʻonui", "Poepoe", "Emi"];

  return (
    <>
      <Text className="text-base text-gray-600 leading-7 mb-5">
        {MAHINA_INTRO}
      </Text>

      {anahulus.map((anahulu) => {
        const meta = ANAHULU_META[anahulu];
        const phases = MAHINA_PHASES.filter((p) => p.anahulu === anahulu);

        return (
          <View key={anahulu} className="mb-5">
            {/* Anahulu group header */}
            <View className="flex-row items-center mb-3">
              <View
                className="rounded-full px-3 py-1.5"
                style={{ backgroundColor: meta.bg }}
              >
                <Text className="text-xs font-bold" style={{ color: meta.color }}>
                  {meta.label}
                </Text>
              </View>
              <Text className="text-xs text-gray-400 ml-2">
                {meta.desc}
              </Text>
            </View>

            {/* Phase cards within group */}
            {phases.map((phase, j) => (
              <View
                key={j}
                className="mb-2 rounded-xl bg-white px-4 py-3.5 flex-row items-start"
                style={{
                  borderWidth: 1,
                  borderColor: "#E7E5E4",
                  borderLeftWidth: 3,
                  borderLeftColor: meta.color,
                }}
              >
                <View className="flex-1">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-base font-bold text-gray-900">
                      {phase.title}
                    </Text>
                    <Text className="text-xs text-gray-400">
                      {phase.night}
                    </Text>
                  </View>
                  {phase.desc ? (
                    <Text className="text-sm text-gray-600 leading-6 mt-1">
                      {phase.desc}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        );
      })}

      {/* Anahulu legend */}
      <View
        className="rounded-xl px-4 py-3 mt-1 mb-2"
        style={{ backgroundColor: "#FAFAF9", borderWidth: 1, borderColor: "#E7E5E4" }}
      >
        <Text className="text-xs font-bold text-gray-500 mb-2 tracking-wider uppercase">
          Anahulu Periods
        </Text>
        {anahulus.map((a) => {
          const meta = ANAHULU_META[a];
          return (
            <View key={a} className="flex-row items-center mb-1">
              <View className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: meta.color }} />
              <Text className="text-xs text-gray-500">
                <Text className="font-bold">{meta.label}</Text> — {meta.desc}
              </Text>
            </View>
          );
        })}
      </View>
    </>
  );
}

/** Kau — side-by-side season cards */
function KauContent({ cardWidth }: { cardWidth: number }) {
  return (
    <>
      <Text className="text-base text-gray-600 leading-7 mb-5">
        {KAU_INTRO}
      </Text>

      <View className="flex-row" style={{ gap: 12 }}>
        {KAU_SEASONS.map((season, j) => (
          <View
            key={j}
            className="rounded-2xl overflow-hidden"
            style={{
              width: cardWidth,
              backgroundColor: season.bg,
              borderWidth: 1,
              borderColor: `${season.color}20`,
            }}
          >
            {/* Season icon header */}
            <View className="items-center pt-5 pb-3">
              <View
                className="w-14 h-14 rounded-full items-center justify-center mb-3"
                style={{ backgroundColor: `${season.color}15` }}
              >
                <Ionicons
                  name={season.icon as keyof typeof Ionicons.glyphMap}
                  size={28}
                  color={season.color}
                />
              </View>
              <Text className="text-base font-bold text-gray-900">
                {season.title}
              </Text>
              <Text className="text-xs mt-0.5" style={{ color: season.color }}>
                {season.months}
              </Text>
            </View>

            {/* Description */}
            <View className="px-4 pb-5">
              <Text className="text-xs text-gray-600 leading-5 text-center">
                {season.desc}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </>
  );
}
