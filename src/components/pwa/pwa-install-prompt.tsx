"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Share, PlusSquare, MoreVertical, Download, Smartphone } from "lucide-react";

type DeviceType = "ios" | "android" | "desktop" | "unknown";

interface InstallStep {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const DISMISS_KEY = "pwa-install-prompt-dismissed";
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

function getDeviceType(): DeviceType {
  if (typeof window === "undefined") return "unknown";

  const ua = navigator.userAgent.toLowerCase();

  if (/iphone|ipad|ipod/.test(ua)) {
    return "ios";
  }

  if (/android/.test(ua)) {
    return "android";
  }

  return "desktop";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return true;

  // Check if running as installed PWA
  const isStandaloneMode =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

  return isStandaloneMode;
}

function isSafari(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  return /safari/.test(ua) && !/chrome/.test(ua) && !/crios/.test(ua);
}

function getInstallSteps(deviceType: DeviceType): InstallStep[] {
  if (deviceType === "ios") {
    return [
      {
        icon: <Share className="h-6 w-6 text-blue-500" />,
        title: "Tap the Share button",
        description: "Find the share icon at the bottom of Safari",
      },
      {
        icon: <PlusSquare className="h-6 w-6 text-blue-500" />,
        title: "Add to Home Screen",
        description: "Scroll down and tap \"Add to Home Screen\"",
      },
      {
        icon: <Smartphone className="h-6 w-6 text-blue-500" />,
        title: "Tap Add",
        description: "Confirm by tapping \"Add\" in the top right corner",
      },
    ];
  }

  if (deviceType === "android") {
    return [
      {
        icon: <MoreVertical className="h-6 w-6 text-blue-500" />,
        title: "Tap the menu button",
        description: "Find the three dots (⋮) in the top right corner of Chrome",
      },
      {
        icon: <Download className="h-6 w-6 text-blue-500" />,
        title: "Install app or Add to Home screen",
        description: "Look for \"Install app\" or \"Add to Home screen\" option",
      },
      {
        icon: <Smartphone className="h-6 w-6 text-blue-500" />,
        title: "Tap Install",
        description: "Confirm the installation when prompted",
      },
    ];
  }

  // Desktop
  return [
    {
      icon: <Download className="h-6 w-6 text-blue-500" />,
      title: "Look for the install icon",
      description: "Check the address bar for an install icon (usually on the right side)",
    },
    {
      icon: <PlusSquare className="h-6 w-6 text-blue-500" />,
      title: "Click Install",
      description: "Click the install button or select \"Install\" from the browser menu",
    },
    {
      icon: <Smartphone className="h-6 w-6 text-blue-500" />,
      title: "Confirm installation",
      description: "The app will be added to your desktop or app launcher",
    },
  ];
}

export function PWAInstallPrompt() {
  const [isOpen, setIsOpen] = useState(false);
  const [deviceType, setDeviceType] = useState<DeviceType>("unknown");

  useEffect(() => {
    // Check if already installed as PWA
    if (isStandalone()) {
      return;
    }

    // Check if previously dismissed
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      if (Date.now() - dismissedTime < DISMISS_DURATION) {
        return;
      }
    }

    const device = getDeviceType();
    setDeviceType(device);

    // For iOS, only show in Safari (other browsers can't install PWAs)
    if (device === "ios" && !isSafari()) {
      return;
    }

    // Small delay to avoid showing immediately on page load
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setIsOpen(false);
  };

  const handleRemindLater = () => {
    // Don't set dismiss key, just close - will show again on next visit
    setIsOpen(false);
  };

  const steps = getInstallSteps(deviceType);

  if (deviceType === "unknown") {
    return null;
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent side="bottom" className="rounded-t-xl max-h-[85vh] px-4 overflow-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="text-xl flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Install KILO App
          </SheetTitle>
          <SheetDescription>
            Add KILO to your home screen for quick access and a better experience
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-4">
          {steps.map((step, index) => (
            <div key={index} className="flex items-start gap-4">
              <div className="shrink-0 w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
                {step.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">
                  <span className="text-blue-500 mr-2">{index + 1}.</span>
                  {step.title}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <SheetFooter className="flex-col gap-2 sm:flex-col">
          <Button
            variant="outline"
            onClick={handleRemindLater}
            className="w-full"
          >
            Maybe later
          </Button>
          <Button
            variant="ghost"
            onClick={handleDismiss}
            className="w-full text-muted-foreground"
          >
            Don&apos;t show again
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
