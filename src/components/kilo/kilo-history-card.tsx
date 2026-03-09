"use client";

import { useEffect, useState, useTransition } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChevronLeft, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
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
    error, setError,
    deletingId, deleteEntry
  } = useKiloEntries();

  function fetchPage(p: number, onDone?: () => void) {
    fetch(`/api/kilo?page=${p}&limit=${PAGE_SIZE}`)
      .then((r) => {
        if (!r.ok) {
          throw new Error(`Failed to load entries (${r.status})`);
        }
        return r.json();
      })
      .then((data) => {
        setEntries(data.entries ?? []);
        setTotalPages(data.totalPages ?? 1);
        setTotal(data.total ?? 0);
        setError(null);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Failed to load entries";
        setError(message);
        toast.error("Failed to load entries", {
          description: "Please check your connection and try again.",
        });
      })
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
        ) : error ? (
          <div className="space-y-4 py-4">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchPage(page)}
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
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
