"use client";

import { useEffect, useState, useTransition } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Clock, Loader2, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import useKiloEntries from "@/hooks/use-kilo";

type KiloEntry = {
  id: number;
  q1: string | null;
  q2: string | null;
  q3: string | null;
  location: string | null;
  created_at: string | null;
};

const PAGE_SIZE = 5;

export function KiloHistoryCard() {
  const [isPending, startTransition] = useTransition();
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const {
    entries, setEntries,
    initialLoading, setInitialLoading,
    // error, TODO handle error state
    deletingId, deleteEntry
  } = useKiloEntries();

  function fetchPage(p: number, onDone?: () => void) {
    fetch(`/api/kilo?page=${p}&limit=${PAGE_SIZE}`)
      .then((r) => r.json())
      .then((data) => {
        setEntries(data.entries ?? []);
        setTotalPages(data.totalPages ?? 1);
        setTotal(data.total ?? 0);
      })
      .catch(() => {})
      .finally(() => onDone?.());
  }

  useEffect(() => {
    fetchPage(1, () => setInitialLoading(false));
  }, []);

  function goToPage(next: number) {
    startTransition(() => {
      setPage(next);
      fetchPage(next);
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Your KILO Entries</CardTitle>
        {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        {initialLoading ? (
          <p className="text-sm text-muted-foreground text-center py-6">Loading entries...</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No entries yet.</p>
        ) : (
          <ul className={`space-y-4 transition-opacity duration-150 ${isPending ? "opacity-50" : "opacity-100"}`}>
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
          </ul>
        )}
      </CardContent>
      {total > PAGE_SIZE && (
        <CardFooter className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1 || isPending}
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages || isPending}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
