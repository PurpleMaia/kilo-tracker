"use client";

import useKiloEntries from "@/hooks/use-kilo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Clock, Trash2, Pencil } from "lucide-react";
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
    <Card className="pb-4">
      <CardHeader>
        <CardTitle>Recent KILO Entries</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {entries.map((entry) => (
          <Card 
            key={entry.id}
            className="group border rounded-lg space-y-4 hover:bg-muted/50 transition-colors"
          >
            {/* Entry Header */}
            <CardHeader className="gap-2 text-sm text-muted-foreground mb-0">
              <div className="flex items-center justify-between gap-2">
                {/* Date Made */}
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 shrink-0" />
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
                {/* Location Done */}
                {/* {entry.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span>{entry.location}</span>
                  </div>
                )} */}

                {/* Buttons */}
                <div className="flex items-center gap-2">
                  <Button id='edit-kilo-button' asChild
                    variant="ghost" size="sm" className="touch-action-manipulation" aria-label="Edit KILO Entry">
                    <Link href={`/kilo?edit=${entry.id}`}>
                      <Pencil className="w-5 h-5" />
                    </Link>
                  </Button>
                  <Button id='delete-kilo-button'                
                   variant="ghost" size="sm" className="touch-action-manipulation text-red-500 hover:text-red-700" aria-label="Delete KILO Entry"
                   onClick={() => deleteEntry(entry.id)} 
                   disabled={deletingId === entry.id}>
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
              </div>

            </CardHeader>  
            <CardContent className="pt-0 space-y-2">                
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
            </CardContent>                  
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}