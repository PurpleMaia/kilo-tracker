"use client";

import { useEffect, useState, useTransition } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import useKiloEntries from "@/hooks/use-kilo";
import KiloCard from "./kilo";

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
              <KiloCard entry={entry} key={entry.id} 
                deletingId={deletingId}
                deleteEntry={deleteEntry}              
              />
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
