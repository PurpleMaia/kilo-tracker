import {
  getMoonAge,
  getMoonIllumination,
  getHawaiianMoonPhase,
  SYNODIC_MONTH,
} from "@/lib/moon";

describe("moon phase calculations", () => {
  describe("getMoonAge", () => {
    it("returns ~0 for a known new moon date (Jan 6, 2000)", () => {
      // KNOWN_NEW_MOON_JD = 2451550.1 = Jan 6, 2000 18:14 UTC
      const newMoon = new Date("2000-01-06T18:14:00Z");
      const age = getMoonAge(newMoon);
      expect(age).toBeCloseTo(0, 0);
    });

    it("returns approximately half synodic month for a full moon ~14.77 days later", () => {
      const fullMoon = new Date("2000-01-21T04:41:00Z"); // known full moon
      const age = getMoonAge(fullMoon);
      expect(age).toBeGreaterThan(13);
      expect(age).toBeLessThan(16);
    });

    it("always returns a value between 0 and SYNODIC_MONTH", () => {
      const dates = [
        new Date("1990-06-15T00:00:00Z"),
        new Date("2025-03-01T12:00:00Z"),
        new Date("2030-12-31T23:59:59Z"),
      ];
      for (const d of dates) {
        const age = getMoonAge(d);
        expect(age).toBeGreaterThanOrEqual(0);
        expect(age).toBeLessThan(SYNODIC_MONTH);
      }
    });
  });

  describe("getMoonIllumination", () => {
    it("returns near 0% illumination at new moon", () => {
      const newMoon = new Date("2000-01-06T18:14:00Z");
      const illum = getMoonIllumination(newMoon);
      expect(illum).toBeLessThan(1);
    });

    it("returns near 100% illumination at full moon", () => {
      const fullMoon = new Date("2000-01-21T04:41:00Z");
      const illum = getMoonIllumination(fullMoon);
      expect(illum).toBeGreaterThan(95);
    });

    it("returns values between 0 and 100", () => {
      // Test across many dates
      for (let i = 0; i < 30; i++) {
        const d = new Date("2025-01-01T00:00:00Z");
        d.setDate(d.getDate() + i);
        const illum = getMoonIllumination(d);
        expect(illum).toBeGreaterThanOrEqual(0);
        expect(illum).toBeLessThanOrEqual(100);
      }
    });
  });

  describe("getHawaiianMoonPhase", () => {
    it("returns a valid MoonPhaseResult", () => {
      const result = getHawaiianMoonPhase(new Date("2025-06-15T00:00:00Z"));
      expect(result).toHaveProperty("name");
      expect(result).toHaveProperty("night");
      expect(result).toHaveProperty("illumination");
      expect(result).toHaveProperty("description");
      expect(result).toHaveProperty("date");
      expect(result.night).toBeGreaterThanOrEqual(1);
      expect(result.night).toBeLessThanOrEqual(30);
      expect(result.date).toBe("2025-06-15");
    });

    it("returns night ~30 (Muku) or ~1 (Hilo) near a new moon", () => {
      // Jan 29, 2025 was a new moon
      const newMoon = new Date("2025-01-29T12:00:00Z");
      const result = getHawaiianMoonPhase(newMoon);
      // Should be near the beginning or end of the 30-night cycle
      expect(result.night === 30 || result.night <= 2).toBe(true);
    });

    it("returns night ~15 (Hoku) or ~16 (Māhealani) near a full moon", () => {
      // Jan 13, 2025 was a full moon
      const fullMoon = new Date("2025-01-13T22:27:00Z");
      const result = getHawaiianMoonPhase(fullMoon);
      expect(result.night).toBeGreaterThanOrEqual(13);
      expect(result.night).toBeLessThanOrEqual(17);
    });

    it("formats the date as ISO date string", () => {
      const result = getHawaiianMoonPhase(new Date("2025-12-25T15:30:00Z"));
      expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
