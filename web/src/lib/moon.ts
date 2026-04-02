// Hawaiian Moon Phase (Mahina) Calculator
// Uses astronomical algorithms to compute moon age and illumination,
// then maps to one of the 30 traditional Hawaiian lunar night names.

export type MoonPhaseResult = {
  name: string;
  illumination: number;
  description: string;
  anahulu: string;
  waning: boolean;
  date: string;
};

export const SYNODIC_MONTH = 29.53058770576;
export const KNOWN_NEW_MOON_JD = 2451550.1; // Jan 6, 2000 18:14 UTC

export const HAWAIIAN_MOON_PHASES: {
  name: string;
  min_range: number;
  max_range: number;
  description: string;
  anahulu: string;
}[] = [
  { name: "Hilo", min_range: 0.5, max_range: 2.5, description: "First visible crescent", anahulu: "Hoʻonui" },
  { name: "Hoaka", min_range: 2.5, max_range: 6, description: "Crescent moon", anahulu: "Hoʻonui" },
  { name: "Kūkahi", min_range: 6, max_range: 12, description: "First Kū night", anahulu: "Hoʻonui" },
  { name: "Kūlua", min_range: 12, max_range: 20, description: "Second Kū night", anahulu: "Hoʻonui" },
  { name: "Kūkolu", min_range: 20, max_range: 24, description: "Third Kū night", anahulu: "Hoʻonui" },
  { name: "Kūpau", min_range: 24, max_range: 34, description: "Last Kū night", anahulu: "Hoʻonui" },
  { name: "ʻOlekūkahi", min_range: 34, max_range: 44, description: "First ʻOle Kū night", anahulu: "Hoʻonui" },
  { name: "ʻOlekūlua", min_range: 44, max_range: 55, description: "Second ʻOle Kū night", anahulu: "Hoʻonui" },
  { name: "ʻOlekūkolu", min_range: 55, max_range: 65, description: "Third ʻOle Kū night", anahulu: "Hoʻonui" },
  { name: "ʻOlepau", min_range: 65, max_range: 70, description: "Last ʻOle Kū night", anahulu: "Hoʻonui" },
  { name: "Huna", min_range: 70, max_range: 78, description: "Hidden moon", anahulu: "Poepoe" },
  { name: "Mōhalu", min_range: 78, max_range: 87, description: "Opening bud", anahulu: "Poepoe" },
  { name: "Hua", min_range: 87, max_range: 92, description: "Fruitful night", anahulu: "Poepoe" },
  { name: "Akua", min_range: 92, max_range: 95, description: "Night of the gods", anahulu: "Poepoe" },
  { name: "Hoku", min_range: 95, max_range: 100, description: "Full moon", anahulu: "Poepoe" },
  { name: "Māhealani", min_range: 100, max_range: 98.6, description: "Full moon glow", anahulu: "Poepoe" },
  { name: "Kulu", min_range: 98.6, max_range: 97.5, description: "Dripping moon", anahulu: "Poepoe" },
  { name: "Lāʻaukūkahi", min_range: 97.5, max_range: 95, description: "First Lāʻau Kū night", anahulu: "Poepoe" },
  { name: "Lāʻaukūlua", min_range: 95, max_range: 90, description: "Second Lāʻau Kū night", anahulu: "Poepoe" },
  { name: "Lāʻaupau", min_range: 90, max_range: 82, description: "Last Lāʻau night", anahulu: "Poepoe" },
  { name: "ʻOlekūkahi", min_range: 82, max_range: 68.5, description: "First ʻOle night (waning)", anahulu: "Hoʻēmi" },
  { name: "ʻOlekūlua", min_range: 68.5, max_range: 56, description: "Second ʻOle night (waning)", anahulu: "Hoʻēmi" },
  { name: "ʻOlepau", min_range: 56, max_range: 44, description: "Last ʻOle night", anahulu: "Hoʻēmi" },
  { name: "Kāloakūkahi", min_range: 44, max_range: 33, description: "First Kāloa night", anahulu: "Hoʻēmi" },
  { name: "Kāloakūlua", min_range: 33, max_range: 22, description: "Second Kāloa night", anahulu: "Hoʻēmi" },
  { name: "Kāloapau", min_range: 22, max_range: 13, description: "Last Kāloa night", anahulu: "Hoʻēmi" },
  { name: "Kāne", min_range: 13, max_range: 5, description: "Night of Kāne", anahulu: "Hoʻēmi" },
  { name: "Lono", min_range: 5, max_range: 4, description: "Night of Lono", anahulu: "Hoʻēmi" },
  { name: "Mauli", min_range: 4, max_range: 1, description: "Last sliver of moon", anahulu: "Hoʻēmi" },
  { name: "Muku", min_range: 1, max_range: 0, description: "Dark moon, new cycle", anahulu: "Hoʻēmi" },
];

export function getMoonAge(date: Date): number {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const daysSinceNewMoon = jd - KNOWN_NEW_MOON_JD;
  return (
    ((daysSinceNewMoon % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH
  );
}

export function getMoonIllumination(age: number): number {
  return ((1 - Math.cos((2 * Math.PI * age) / SYNODIC_MONTH)) / 2) * 100;
}

export function getHawaiianMoonPhase(date: Date): MoonPhaseResult {
  const age = getMoonAge(date);
  const illumination = getMoonIllumination(age);
  const isWaning = age > SYNODIC_MONTH / 2;

  // Near-zero illumination with very young moon = Muku (dark moon, new cycle)
  if (illumination < 0.5 && age < 1) {
    const muku = HAWAIIAN_MOON_PHASES.find((p) => p.name === "Muku")!;
    return {
      name: muku.name,
      waning: false,
      illumination: Math.round(illumination * 100) / 100,
      description: muku.description,
      anahulu: muku.anahulu,
      date: date.toISOString().split("T")[0],
    };
  }

  // Filter phases by direction: waxing searches Hoʻonui + waxing Poepoe,
  // waning searches waning Poepoe + Hoʻēmi
  const candidates = isWaning
    ? HAWAIIAN_MOON_PHASES.filter((p) => p.min_range > p.max_range)
    : HAWAIIAN_MOON_PHASES.filter((p) => p.min_range <= p.max_range);

  let phase = HAWAIIAN_MOON_PHASES[0];

  for (const p of candidates) {
    if (p.min_range <= p.max_range) {
      // Waxing: min < max, match [min, max)
      if (illumination >= p.min_range && illumination < p.max_range) {
        phase = p;
        break;
      }
    } else {
      // Waning: min > max, match (max, min]
      if (illumination <= p.min_range && illumination > p.max_range) {
        phase = p;
        break;
      }
    }
  }

  return {
    name: phase.name,
    waning: isWaning,
    illumination: Math.round(illumination * 100) / 100,
    description: phase.description,
    anahulu: phase.anahulu,
    date: date.toISOString().split("T")[0],
  };
}
