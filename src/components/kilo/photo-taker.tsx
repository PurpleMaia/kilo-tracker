"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Camera, CameraOff, RotateCcw, SwitchCamera, X } from "lucide-react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface PhotoTakerProps {
  photoPreview: string | null;
  onPhotoCapture: (dataUrl: string) => void;
  onPhotoRemove: () => void;
}

export function PhotoTaker({ photoPreview, onPhotoCapture, onPhotoRemove }: PhotoTakerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async (facing: "environment" | "user") => {
    try {
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      setIsCameraReady(false);
      setCameraError(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsCameraReady(true);
        };
      }
    } catch (err) {
      console.error("Camera error:", err);
      setCameraError("Unable to access camera. Please check permissions.");
    }
  }, []);

  // Start camera when dialog opens or facing mode changes
  useEffect(() => {
    if (!isDialogOpen) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      setIsCameraReady(false);
      setCameraError(null);
      return;
    }

    startCamera(facingMode);

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [isDialogOpen, facingMode, startCamera]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsDialogOpen(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Mirror the capture if using front camera to match the preview
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0);

    // Convert to data URL
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    onPhotoCapture(dataUrl);
    stopCamera();
  }, [onPhotoCapture, stopCamera, facingMode]);

  const flipCamera = useCallback(() => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  }, []);

  const retakePhoto = useCallback(() => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    onPhotoRemove();
    // Reopen camera
    setIsDialogOpen(true);
  }, [photoPreview, onPhotoRemove]);

  const handleRemove = useCallback(() => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    onPhotoRemove();
  }, [photoPreview, onPhotoRemove]);

  return (
    <div className="space-y-2 pt-1">
      <p className="text-xs text-muted-foreground">Take a photo of your Kilo (optional)</p>

      {photoPreview ? (
        <div className="space-y-2">
          <div className="relative w-fit">
            <img src={photoPreview} alt="Kilo photo" width={300} height={200} className="rounded-md max-h-48 object-cover" />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white hover:bg-black/80"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={retakePhoto}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Retake
          </Button>
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => setIsDialogOpen(true)}>
          <Camera className="h-4 w-4 mr-2" />
          Open Camera
        </Button>
      )}

      {/* Camera Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="h-[80vh] sm:h-auto sm:max-w-xl p-2 gap-0">
          <DialogHeader className="p-4">
            <DialogTitle>Take Photo</DialogTitle>            
          </DialogHeader>
          <div className="flex-1 relative bg-black min-h-100 sm:min-h-60">
            {cameraError ? (
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <Alert variant="destructive" className="max-w-sm">
                  <AlertDescription>{cameraError}</AlertDescription>
                </Alert>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  className={`w-full h-full object-cover${facingMode === "user" ? " -scale-x-100" : ""}`}
                  playsInline
                  muted
                  autoPlay
                />
                <canvas ref={canvasRef} className="hidden" />

                {!isCameraReady && !cameraError && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2 text-white">
                      <Camera className="h-8 w-8 animate-pulse" />
                      <span className="text-sm">Starting camera...</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

            <div className="flex items-center justify-center gap-6 my-4">
              <Button
                onClick={flipCamera}
                disabled={!isCameraReady}
                variant="ghost"
                className="h-10 w-10 rounded-full text-gray-600 hover:bg-gray-100 p-0"
              >
                <SwitchCamera className="h-6 w-6" />
              </Button>
              <Button
                onClick={capturePhoto}
                disabled={!isCameraReady}
                className="h-15 w-15 rounded-full bg-white border-4 border-gray-300 text-black hover:bg-white/90 p-0"
              >
                <Camera className="h-12 w-12" />
              </Button>
              {/* Spacer to keep capture button centered */}
              <div className="h-10 w-10" />
            </div>
        </DialogContent>        
      </Dialog>      
    </div>
  );
}