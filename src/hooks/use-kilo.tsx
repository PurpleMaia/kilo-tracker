"use client";

import { KiloEntry } from "@/types/kilo";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const useKiloEntries = () => {
    const router = useRouter();
    const [entries, setEntries] = useState<KiloEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);    
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [updatingId, setUpdatingId] = useState<number | null>(null);

    async function fetchEntries() {
        try {
            setIsLoading(true);
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

    useEffect(() => {
        fetchEntries();
    }, []);

    async function validateSession() {
        try {
            const response = await fetch("/api/auth/session");
            if (!response.ok) {
                throw new Error("Unauthorized");
            }
        } catch (err) {
            router.push("/login");
            setError("You must be logged in to view your KILO entries.");
        }
    }

    const deleteEntry = async (id: number) => {
        setDeletingId(id);
        try {            
            await validateSession(); // Ensure user is authenticated before attempting delete
            const response = await fetch("/api/kilo", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to delete entry");
            }

            setEntries((prev) => prev.filter((entry) => entry.id !== id));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete entry");
        } finally {
            setDeletingId(null);
        }
    }

    const updateEntry = async (id: number, updatedData: Partial<KiloEntry>) => {
        setUpdatingId(id);
        try {
            await validateSession(); // Ensure user is authenticated before attempting update
            const response = await fetch("/api/kilo", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, ...updatedData }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to update entry");
            }

            const data = await response.json();
            setEntries((prev) =>
                prev.map((entry) => (entry.id === id ? data.entry : entry))
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update entry");
        } finally {
            setUpdatingId(null);
        }
    }

    return { 
        entries, isLoading, error, 
        deletingId, deleteEntry,
        updatingId, updateEntry,
    };
};

export default useKiloEntries;