"use client";

import useKiloEntries from "@/hooks/use-kilo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, MapPin, Clock, Trash2, Pencil } from "lucide-react";
import Link from "next/link";

export function KiloEntryList() {
  const { 
    entries, isLoading, error,
    deletingId, deleteEntry,
  } = useKiloEntries();

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
            className="group border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors"
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
              <div className="flex items-center gap-2">
                {entry.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>{entry.location}</span>
                  </div>
                )}
                {/* Edit Kilo Button */}
                <Button asChild
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-900/20"                  
                >
                  <Link href={`/kilo?edit=${entry.id}`}>
                    <Pencil />
                  </Link>
                </Button>

                {/* Delete Kilo Button  */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20"
                  onClick={() => deleteEntry(entry.id)}
                  disabled={deletingId === entry.id}
                >
                  {deletingId === entry.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
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