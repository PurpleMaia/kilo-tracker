"use client";

import { KiloEntry } from "@/types/kilo";
import { useState } from "react";
import { useRouter } from "next/navigation";

const useKiloEntries = () => {
    const router = useRouter();
    const [entries, setEntries] = useState<KiloEntry[]>([]);
    const [initialLoading, setInitialLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);    
    const [deletingId, setDeletingId] = useState<number | null>(null);

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

    return { 
        entries, setEntries,
        initialLoading, setInitialLoading,
        error, 
        deletingId, deleteEntry
    };
};

export default useKiloEntries;