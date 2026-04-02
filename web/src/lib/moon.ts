// Hawaiian Moon Phase (Mahina) Calculator
// Uses astronomical algorithms to compute moon age and illumination,
// then maps to one of the 30 traditional Hawaiian lunar night names.

export type MoonPhaseResult = {
  name: string;
  night: number;
  illumination: number;
  description: string;
  date: string;
};

export const SYNODIC_MONTH = 29.53058770576;
export const KNOWN_NEW_MOON_JD = 2451550.1; // Jan 6, 2000 18:14 UTC

export const HAWAIIAN_MOON_PHASES: {
  name: string;
  night: number;
  description: string;
}[] = [
  { name: "Hilo", night: 1, description: "First visible crescent" },
  { name: "Hoaka", night: 2, description: "Crescent moon" },
  { name: "Kū Kahi", night: 3, description: "First Kū night" },
  { name: "Kū Lua", night: 4, description: "Second Kū night" },
  { name: "Kū Kolu", night: 5, description: "Third Kū night" },
  { name: "Kū Pau", night: 6, description: "Last Kū night" },
  { name: "ʻOle Kū Kahi", night: 7, description: "First ʻOle Kū night" },
  { name: "ʻOle Kū Lua", night: 8, description: "Second ʻOle Kū night" },
  { name: "ʻOle Kū Kolu", night: 9, description: "Third ʻOle Kū night" },
  { name: "ʻOle Kū Pau", night: 10, description: "Last ʻOle Kū night" },
  { name: "Huna", night: 11, description: "Hidden moon" },
  { name: "Mohalu", night: 12, description: "Opening bud" },
  { name: "Hua", night: 13, description: "Fruitful night" },
  { name: "Akua", night: 14, description: "Night of the gods" },
  { name: "Hoku", night: 15, description: "Full moon" },
  { name: "Māhealani", night: 16, description: "Full moon glow" },
  { name: "Kulu", night: 17, description: "Dripping moon" },
  { name: "Lāʻau Kū Kahi", night: 18, description: "First Lāʻau Kū night" },
  { name: "Lāʻau Kū Lua", night: 19, description: "Second Lāʻau Kū night" },
  { name: "Lāʻau Pau", night: 20, description: "Last Lāʻau night" },
  { name: "ʻOle Kū Kahi", night: 21, description: "First ʻOle night (waning)" },
  { name: "ʻOle Kū Lua", night: 22, description: "Second ʻOle night (waning)" },
  { name: "ʻOle Pau", night: 23, description: "Last ʻOle night" },
  { name: "Kāloa Kū Kahi", night: 24, description: "First Kāloa night" },
  { name: "Kāloa Kū Lua", night: 25, description: "Second Kāloa night" },
  { name: "Kāloa Pau", night: 26, description: "Last Kāloa night" },
  { name: "Kāne", night: 27, description: "Night of Kāne" },
  { name: "Lono", night: 28, description: "Night of Lono" },
  { name: "Mauli", night: 29, description: "Last sliver of moon" },
  { name: "Muku", night: 30, description: "Dark moon, new cycle" },
];

export function getMoonAge(date: Date): number {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const daysSinceNewMoon = jd - KNOWN_NEW_MOON_JD;
  return (
    ((daysSinceNewMoon % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH
  );
}

export function getMoonIllumination(date: Date): number {
  const age = getMoonAge(date);
  return ((1 - Math.cos((2 * Math.PI * age) / SYNODIC_MONTH)) / 2) * 100;
}

export function getHawaiianMoonPhase(date: Date): MoonPhaseResult {
  const age = getMoonAge(date);
  const illumination = getMoonIllumination(date);
  const nightIndex = Math.min(Math.max(Math.floor(age), 0), 29);
  const phase = HAWAIIAN_MOON_PHASES[nightIndex];

  return {
    name: phase.name,
    night: phase.night,
    illumination: Math.round(illumination * 100) / 100,
    description: phase.description,
    date: date.toISOString().split("T")[0],
  };
}
