"use client";

import { useEffect, useState, useTransition } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

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
  const [entries, setEntries] = useState<KiloEntry[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

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
