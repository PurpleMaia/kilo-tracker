"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, MapPin, Clock } from "lucide-react";

type KiloEntry = {
  id: number;
  q1: string | null;
  q2: string | null;
  q3: string | null;
  location: string | null;
  created_at: string | null;
};

export function KiloEntryList() {
  const [entries, setEntries] = useState<KiloEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEntries() {
      try {
        const response = await fetch("/api/kilo");
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to fetch entries");
        }
        const data = await response.json();
        setEntries(data.entries);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load entries");
      } finally {
        setIsLoading(false);
      }
    }

    fetchEntries();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-red-500">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent KILO Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No entries yet. Go to the KILO page to add your first entry.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent KILO Entries</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="border rounded-lg p-4 space-y-3"
          >
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>
                  {entry.created_at
                    ? new Date(entry.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Unknown date"}
                </span>
              </div>
              {entry.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <span>{entry.location}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              {entry.q1 && (
                <div>
                  <p className="font-medium text-sm">Question 1:</p>
                  <p className="text-sm">{entry.q1}</p>
                </div>
              )}
              {entry.q2 && (
                <div>
                  <p className="font-medium text-sm">Question 2:</p>
                  <p className="text-sm">{entry.q2}</p>
                </div>
              )}
              {entry.q3 && (
                <div>
                  <p className="font-medium text-sm">Question 3:</p>
                  <p className="text-sm">{entry.q3}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}