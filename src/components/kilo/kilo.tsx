"use client"

// Main Kilo Card
// - edit, delete, view kilo
// - view picture

import Link from 'next/link'
import Image from 'next/image'
import { KiloEntry, QUESTIONS } from '@/types/kilo'
import { Clock, Pencil, Trash2 } from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardHeader, CardContent } from '../ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTrigger } from '../ui/dialog'
import { DialogTitle } from '@radix-ui/react-dialog'

interface KiloCardProps {
    entry: KiloEntry
    deletingId: number | null
    deleteEntry: (id: number) => void
}
export default function KiloCard({ entry, deletingId, deleteEntry }: KiloCardProps) {
  return (
    <Card 
        key={entry.id}
        className="group border rounded-lg space-y-4 hover:bg-muted/50 transition-colors"
        >
        {/* Entry Header */}
        <CardHeader className="gap-2 text-sm text-muted-foreground mb-0">
            <div className="flex items-center justify-between">
            {/* Date Made */}
            <div className="flex items-center gap-2">
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
            <div className="flex items-center">
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
            <div className="space-y-2 grow">        
            {entry.q1 && (
            <div>
                <p className="font-medium text-sm text-wrap">{QUESTIONS[0].question}:</p>
                <p className="text-sm">{entry.q1}</p>
            </div>
            )}
            <div className='border-t my-2' />
            {entry.q2 && (
                <div>
                <p className="font-medium text-sm text-wrap">{QUESTIONS[1].question}:</p>
                <p className="text-sm">{entry.q2}</p>
            </div>
            )}              
            <div className='border-t my-2' />
            {entry.q3 && (
            <div>
                <p className="font-medium text-sm ">{QUESTIONS[2].question}:</p>
                <p className="text-sm text-wrap">{entry.q3}</p>
            </div>
            )}
            </div>  
        </CardContent>
    </Card>
  )
}
