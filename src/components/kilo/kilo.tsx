"use client"

// Main Kilo Card
// - edit, delete, view kilo
// - view picture

import { useState } from 'react'
import Link from 'next/link'
import { KiloEntry, QUESTIONS } from '@/types/kilo'
import { Clock, Pencil, Trash2, Sparkles, Loader2 } from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardHeader, CardContent, CardFooter } from '../ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTrigger, DialogTitle } from '../ui/dialog'
import { toast } from 'sonner'

interface KiloCardProps {
    entry: KiloEntry
    deletingId: number | null
    deleteEntry: (id: number) => void
}
export default function KiloCard({ entry, deletingId, deleteEntry }: KiloCardProps) {
  const [generating, setGenerating] = useState(false);
  const hasPhoto = entry.has_photo;
  const date = entry.created_at ? new Date(entry.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }) : "Unknown date";

  const handleGenerateTasks = async () => {
    setGenerating(true);
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kiloId: entry.id,
          q1: entry.q1 ?? null,
          q2: entry.q2 ?? null,
          q3: entry.q3 ?? null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate tasks");
      }

      const data = await response.json();
      if (data.tasks.length === 0) {
        toast.success("No tasks generated", {
          description: "Entry was too brief to extract tasks. Try adding more detail.",
        });
      } else {
        toast.success(`Generated ${data.tasks.length} task${data.tasks.length === 1 ? "" : "s"}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate tasks");
    } finally {
      setGenerating(false);
    }
  };

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
                <span>{date}</span>
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
        <CardContent className="pt-0 space-y-2 w-full">
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

            {hasPhoto && (
                <>
                  <div className='border-b'></div>
                  <PicturePreviewDialog entryId={entry.id} date={date} />
                </>
            )}
        </CardContent>
        <CardFooter className="justify-end pt-0">
            <Button
              variant="ghost"
              size="sm"
              className="touch-action-manipulation text-muted-foreground hover:text-primary"
              aria-label="Generate tasks from KILO entry"
              onClick={handleGenerateTasks}
              disabled={generating}
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span className="ml-1 text-xs">Generate Tasks</span>
            </Button>
        </CardFooter>
    </Card>
  )
}

function PicturePreviewDialog({ entryId, date }: { entryId: number, date: string }) {
    const photoUrl = `/api/kilo/photo?id=${entryId}`;

    return (
      <Dialog>
        <DialogTrigger asChild>
          <div className="relative w-full h-24 sm:h-28 md:h-32 lg:h-36 cursor-pointer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={photoUrl}
                alt="KILO Entry Photo"
                className="object-cover rounded-lg w-full h-full"/>
            </div>
        </DialogTrigger>
        <DialogContent className={
            "h-[70vh]"
        }>
          <DialogHeader className=''>
            <DialogTitle>{date}</DialogTitle>
          </DialogHeader>
          <div className='w-full h-108 relative'>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl}
              alt="KILO Entry Photo"
              className="object-contain rounded-lg w-full h-full"
              />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

