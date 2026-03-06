"use client"

// Main Kilo Card
// - edit, delete, view kilo
// - view picture

import Link from 'next/link'
import useKiloEntries from '@/hooks/use-kilo'
import { KiloEntry } from '@/types/kilo'
import { Clock, Pencil, Trash2 } from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardHeader, CardContent } from '../ui/card'

interface KiloCardProps {
    entry: KiloEntry
}
export default function KiloCard({ entry }: KiloCardProps) {
  const { deletingId, deleteEntry } = useKiloEntries();
  return (
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
        <CardContent className="pt-0 space-y-2 flex w-full">
            <div className="space-y-2 flex-3">        
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

            <div className='border-l mx-4'></div>   

            <div className="flex-4 flex items-center align-middle">
                {entry.photo_path && (
                    <img src={entry.photo_path} alt="KILO Entry Photo" className="w-full h-auto rounded-lg" />
                )}
            </div>
        </CardContent>
    </Card>
  )
}
