"use client"; 

import { KiloEntryForm } from "@/components/kilo/kilo-entry-form";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { KiloEntry } from "@/types/kilo";
import { useSearchParams } from "next/navigation";

export default function KiloPage() {
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit") || null;

  const [editEntry, setEditEntry] = useState<KiloEntry | null>(null);
  const [isLoadingEntry, setIsLoadingEntry] = useState(!!editId);
  const [error, setError] = useState<string | null>(null);

  // Fetch entry data when in edit mode
  useEffect(() => {
    if (!editId) {
      setEditEntry(null);
      setIsLoadingEntry(false);
      return;
    }

    async function fetchEntry() {
      try {
        setIsLoadingEntry(true);
        const response = await fetch(`/api/kilo?id=${editId}`);
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to fetch entry");
        }
        const data = await response.json();
        setEditEntry(data.entry);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load entry");
      } finally {
        setIsLoadingEntry(false);
      }
    }

    fetchEntry();
  }, [editId]);

  if (isLoadingEntry) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-sm py-4">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <KiloEntryForm
        initialData={editEntry}
      />
    </div>
  );
}