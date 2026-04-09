import { useMemo, useEffect } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type Props = {
  year: number;
  month: number; // 1-indexed
  markedDates: Set<string>;
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
  onChangeMonth: (year: number, month: number) => void;
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month - 1, 1).getDay();
}

function formatDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function todayKey() {
  const now = new Date();
  return formatDateKey(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

function CalendarDot({ visible }: { visible: boolean }) {
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = visible ? withSpring(1, { damping: 12, stiffness: 200 }) : 0;
  }, [visible, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (!visible) return <View style={{ height: 4, marginTop: 2 }} />;

  return (
    <Animated.View
      style={[
        {
          width: 4,
          height: 4,
          borderRadius: 2,
          backgroundColor: "#15803D",
          marginTop: 2,
          alignSelf: "center",
        },
        animStyle,
      ]}
    />
  );
}

export function KiloCalendar({
  year,
  month,
  markedDates,
  selectedDate,
  onSelectDate,
  onChangeMonth,
}: Props) {
  const today = todayKey();

  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfWeek(year, month);

    // Previous month padding
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);

    const days: { day: number; key: string; isCurrentMonth: boolean }[] = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      days.push({
        day: d,
        key: formatDateKey(prevYear, prevMonth, d),
        isCurrentMonth: false,
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      days.push({
        day: d,
        key: formatDateKey(year, month, d),
        isCurrentMonth: true,
      });
    }

    // Fill remaining cells to complete grid
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      for (let d = 1; d <= remaining; d++) {
        days.push({
          day: d,
          key: formatDateKey(nextYear, nextMonth, d),
          isCurrentMonth: false,
        });
      }
    }

    return days;
  }, [year, month]);

  const goToPrevMonth = () => {
    if (month === 1) onChangeMonth(year - 1, 12);
    else onChangeMonth(year, month - 1);
  };

  const goToNextMonth = () => {
    if (month === 12) onChangeMonth(year + 1, 1);
    else onChangeMonth(year, month + 1);
  };

  const handleDayPress = (key: string, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return;
    if (selectedDate === key) {
      onSelectDate(null);
    } else {
      onSelectDate(key);
    }
  };

  const fadeAnim = useSharedValue(0);
  useEffect(() => {
    fadeAnim.value = 0;
    fadeAnim.value = withTiming(1, { duration: 200 });
  }, [year, month, fadeAnim]);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: fadeAnim.value }));

  return (
    <View className="mx-7 mb-4">
      {/* Month header */}
      <View className="flex-row items-center justify-between mb-4">
        <TouchableOpacity onPress={goToPrevMonth} hitSlop={12}>
          <Ionicons name="chevron-back" size={20} color="#6B7280" />
        </TouchableOpacity>
        <Text
          className="text-lg text-gray-900"
          style={{ fontFamily: "Newsreader_400Regular" }}
        >
          {MONTH_NAMES[month - 1]} {year}
        </Text>
        <TouchableOpacity onPress={goToNextMonth} hitSlop={12}>
          <Ionicons name="chevron-forward" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Day labels */}
      <View className="flex-row mb-2">
        {DAY_LABELS.map((label, i) => (
          <View key={i} style={{ flex: 1, alignItems: "center" }}>
            <Text className="text-xs text-gray-400 uppercase" style={{ letterSpacing: 1.5 }}>
              {label}
            </Text>
          </View>
        ))}
      </View>

      {/* Day grid */}
      <Animated.View style={fadeStyle}>
        {Array.from({ length: Math.ceil(calendarDays.length / 7) }).map((_, rowIndex) => (
          <View key={rowIndex} className="flex-row">
            {calendarDays.slice(rowIndex * 7, rowIndex * 7 + 7).map((item) => {
              const isSelected = selectedDate === item.key;
              const isToday = item.key === today && !isSelected;
              const hasEntry = markedDates.has(item.key);

              return (
                <TouchableOpacity
                  key={item.key}
                  style={{ flex: 1, alignItems: "center", paddingVertical: 4 }}
                  onPress={() => handleDayPress(item.key, item.isCurrentMonth)}
                  activeOpacity={item.isCurrentMonth ? 0.6 : 1}
                >
                  <View
                    style={[
                      {
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        alignItems: "center",
                        justifyContent: "center",
                      },
                      isSelected && { backgroundColor: "#15803D" },
                      isToday && { backgroundColor: "#D1E7D5" },
                    ]}
                  >
                    <Text
                      style={[
                        { fontSize: 14 },
                        !item.isCurrentMonth && { opacity: 0.3 },
                        isSelected
                          ? { color: "#FFFFFF", fontWeight: "600" }
                          : { color: "#374151" },
                      ]}
                    >
                      {item.day}
                    </Text>
                  </View>
                  <CalendarDot visible={hasEntry && item.isCurrentMonth} />
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </Animated.View>

      {/* Clear filter pill */}
      {selectedDate && (
        <TouchableOpacity
          className="self-center mt-3"
          onPress={() => onSelectDate(null)}
        >
          <Text className="text-sm" style={{ color: "#15803D" }}>
            All entries
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
