"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type KiloEntry = {
  id: number;
  q1: string | null;
  q2: string | null;
  q3: string | null;
  location: string | null;
  created_at: string | null;
};

export function KiloHistoryCard() {
  const [entries, setEntries] = useState<KiloEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/kilo")
      .then((r) => r.json())
      .then((data) => setEntries(data.entries ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your KILO Entries</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-6">Loading entries...</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No entries yet.</p>
        ) : (
          <ul className="space-y-4">
            {entries.map((entry) => (
              <li key={entry.id} className="border rounded-md p-3 space-y-1 text-sm">
                <p className="text-xs text-muted-foreground">
                  {entry.created_at
                    ? new Date(entry.created_at).toLocaleString()
                    : "No date recorded"}
                </p>
                <p><span className="font-medium">Weather: </span>{entry.q1 ?? "—"}</p>
                {entry.q2 && <p><span className="font-medium">Outside: </span>{entry.q2}</p>}
                {entry.q3 && <p><span className="font-medium">Excited about: </span>{entry.q3}</p>}
                {entry.location && <p><span className="font-medium">Location: </span>{entry.location}</p>}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
