"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

type DailyOlelo = { id: number; text: string | null } | null;

export function DailyOleloCard() {
  const [olelo, setOlelo] = useState<DailyOlelo>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/olelo-noeau/daily")
      .then((r) => r.json())
      .then((data) => setOlelo(data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>ʻOlelo Noʻeau of the Day</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!olelo || !olelo.text) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>ʻOlelo Noʻeau of the Day</CardTitle>
      </CardHeader>
      <CardContent>
        <blockquote className="text-lg italic text-muted-foreground">
          &ldquo;{olelo.text}&rdquo;
        </blockquote>
      </CardContent>
    </Card>
  );
}
