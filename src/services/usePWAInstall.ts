import { useState, useEffect, useCallback } from 'react';

// BeforeInstallPromptEvent type definition
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Global deferred prompt holder so any component can invoke it
let deferredPrompt: BeforeInstallPromptEvent | null = null;
const promptListeners = new Set<(canInstall: boolean) => void>();

function notifyListeners() {
  const canInstall = Boolean(deferredPrompt);
  promptListeners.forEach((listener) => listener(canInstall));
}

// Listen globally as early as possible
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    notifyListeners();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notifyListeners();
  });
}

export function isRunningStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  return /android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(ua);
}

export function isIOSDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) // iPadOS
  );
}

export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState<boolean>(() => Boolean(deferredPrompt));
  const [isInstalled, setIsInstalled] = useState<boolean>(() => isRunningStandalone());
  const [isMobile] = useState<boolean>(() => isMobileDevice());
  const [isIOS] = useState<boolean>(() => isIOSDevice());

  useEffect(() => {
    const handlePromptChange = (installable: boolean) => {
      setCanInstall(installable);
    };

    promptListeners.add(handlePromptChange);

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      promptListeners.delete(handlePromptChange);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const triggerInstallPrompt = useCallback(async (): Promise<'accepted' | 'dismissed' | 'manual_ios' | null> => {
    if (isIOS) {
      return 'manual_ios';
    }

    if (!deferredPrompt) {
      return null;
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        deferredPrompt = null;
        setCanInstall(false);
      }
      return choice.outcome;
    } catch (err) {
      console.warn('Install prompt error:', err);
      return null;
    }
  }, [isIOS]);

  return {
    canInstall,
    isInstalled,
    isMobile,
    isIOS,
    triggerInstallPrompt,
    hasNativePrompt: Boolean(deferredPrompt),
  };
}
