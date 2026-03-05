"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KiloEntryForm } from "./kilo-entry-form";
import { KiloEntryList } from "./kilo-entry-list";
import { KiloEntry } from "@/types/kilo";
import { Loader2 } from "lucide-react";

interface KiloPageClientProps {
  editId: string | null;
}

export function KiloPageClient({ editId }: KiloPageClientProps) {
  const router = useRouter();
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

  const handleCancelEdit = () => {
    // Remove the query parameter to exit edit mode
    router.push("/kilo");
  };

  const handleEntryUpdated = () => {
    // Refresh the list - the KiloEntryList will auto-refresh
  };

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
        onCancelEdit={handleCancelEdit}
      />
    </div>
  );
}