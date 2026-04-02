"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import type { MoonPhaseResult } from "@/lib/moon";

function MoonIcon({ illumination, anahulu }: { illumination: number; anahulu: string }) {
  const size = 64;
  const r = size / 2 - 2;
  const cx = size / 2;
  const cy = size / 2;

  const isWaxing = anahulu === "Hoʻonui";
  const fraction = illumination / 100;

  // The terminator curve: how far the inner edge is from center
  // At 0% illumination: full dark circle
  // At 50% illumination: half moon (terminator is a straight line)
  // At 100% illumination: full bright circle
  const innerX = cx + r * (1 - 2 * fraction) * (isWaxing ? 1 : -1);

  // Build the lit area path
  // For waxing: lit area is on the right side
  // For waning: lit area is on the left side
  const litSide = isWaxing ? 1 : -1;
  const sweepOuter = isWaxing ? 1 : 0;
  const sweepInner = fraction > 0.5 ? sweepOuter : 1 - sweepOuter;

  const path = [
    `M ${cx} ${cy - r}`,
    `A ${r} ${r} 0 0 ${sweepOuter} ${cx} ${cy + r}`,
    `A ${Math.abs(innerX - cx)} ${r} 0 0 ${sweepInner} ${cx} ${cy - r}`,
    "Z",
  ].join(" ");

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Dark background circle */}
      <circle cx={cx} cy={cy} r={r} fill="#1e293b" stroke="#475569" strokeWidth="1" />
      {/* Lit area */}
      {illumination > 0.5 && (
        <path d={path} fill="#fef3c7" />
      )}
      {illumination >= 99.5 && (
        <circle cx={cx} cy={cy} r={r} fill="#fef3c7" />
      )}
    </svg>
  );
}

export function MoonPhaseCard() {
  const [phase, setPhase] = useState<MoonPhaseResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/moon")
      .then((r) => r.json())
      .then((data) => setPhase(data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mahina — Moon Phase</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!phase) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mahina — Moon Phase</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-5">
          <MoonIcon illumination={phase.illumination} anahulu={phase.anahulu} />
          <div className="space-y-1">
            <p className="text-xl font-semibold">{phase.name}</p>
            <p className="text-sm text-muted-foreground">{phase.description}</p>
            <p className="text-xs text-muted-foreground">
              {phase.anahulu} &middot; {Math.round(phase.illumination)}% illuminated
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
