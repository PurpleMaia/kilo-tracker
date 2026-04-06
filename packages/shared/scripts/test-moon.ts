// Usage: npx tsx web/scripts/test-moon.ts [past|future|start-date] [days]
// Examples:
//   npx tsx web/scripts/test-moon.ts past              # past 30 days ending today
//   npx tsx web/scripts/test-moon.ts future             # future 30 days starting today
//   npx tsx web/scripts/test-moon.ts past 45            # past 45 days ending today
//   npx tsx web/scripts/test-moon.ts future 45          # future 45 days starting today
//   npx tsx web/scripts/test-moon.ts 2026-03-18         # 30 days starting from Mar 18
//   npx tsx web/scripts/test-moon.ts 2026-03-18 45      # 45 days starting from Mar 18

import {
  SYNODIC_MONTH,
  HAWAIIAN_MOON_PHASES,
  getMoonAge,
  getMoonIllumination,
  getHawaiianMoonPhase,
} from "../../../web/src/lib/moon";

const modeArg = process.argv[2] || "past";
const daysArg = parseInt(process.argv[3] || "30", 10);
const today = new Date();

let startDate: Date;
if (modeArg === "past") {
  startDate = new Date(today.getTime() - (daysArg - 1) * 86400000);
} else if (modeArg === "future") {
  startDate = new Date(today.getTime());
} else {
  startDate = new Date(`${modeArg}T12:00:00Z`);
}

console.log("=== Mahina Phase Debug ===\n");
console.log(
  "Date".padEnd(12),
  "Phase".padEnd(16),
  "Anahulu".padEnd(10),
  "Illum%".padStart(8),
  "Age".padStart(8),
  "Waning?".padStart(8),
  "Match?"
);
console.log("-".repeat(80));

let gaps = 0;

for (let i = 0; i < daysArg; i++) {
  const d = new Date(startDate);
  d.setDate(d.getDate() + i);

  const age = getMoonAge(d);
  const illumination = getMoonIllumination(age);
  const isWaning = age > SYNODIC_MONTH / 2;
  const result = getHawaiianMoonPhase(d);

  // Check if the result fell back to the default (Hilo at index 0)
  // when it probably shouldn't have
  const isFallback =
    result.name === "Hilo" && illumination > 2.5;
  const flag = isFallback ? "<-- GAP" : "";
  if (isFallback) gaps++;

  console.log(
    d.toISOString().split("T")[0].padEnd(12),
    result.name.padEnd(16),
    result.anahulu.padEnd(10),
    illumination.toFixed(2).padStart(8),
    age.toFixed(2).padStart(8),
    (isWaning ? "yes" : "no").padStart(8),
    flag
  );
}

console.log("-".repeat(80));
if (gaps > 0) {
  console.log(`\n⚠ ${gaps} day(s) fell back to default — likely range gaps.\n`);
} else {
  console.log("\n✓ All days matched a phase.\n");
}

// Show range coverage analysis
console.log("=== Range Coverage ===\n");

const waxing = HAWAIIAN_MOON_PHASES.filter((p) => p.min_range <= p.max_range);
const waning = HAWAIIAN_MOON_PHASES.filter((p) => p.min_range > p.max_range);

console.log("Waxing (Hoʻonui + Poepoe rising):");
for (let i = 0; i < waxing.length; i++) {
  const p = waxing[i];
  const next = waxing[i + 1];
  const gapNote =
    next && next.min_range > p.max_range
      ? `  ← GAP: ${p.max_range}–${next.min_range}% uncovered`
      : "";
  console.log(
    `  ${p.name.padEnd(14)} [${p.min_range}%, ${p.max_range}%)${gapNote}`
  );
}

console.log("\nWaning (Poepoe falling + Hoʻēmi):");
for (let i = 0; i < waning.length; i++) {
  const p = waning[i];
  const next = waning[i + 1];
  const gapNote =
    next && next.min_range < p.max_range
      ? `  ← GAP: ${p.max_range}–${next.min_range}% uncovered`
      : "";
  console.log(
    `  ${p.name.padEnd(14)} (${p.max_range}%, ${p.min_range}%]${gapNote}`
  );
}
