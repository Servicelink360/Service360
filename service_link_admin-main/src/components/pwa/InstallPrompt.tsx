import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';

const DISMISS_KEY = 'service360-pwa-install-dismissed';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const isIos = () => {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
};

const isStandalone = () => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
};

const Banner = styled.div`
  position: fixed;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  z-index: 10000;
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: min(560px, calc(100vw - 32px));
  padding: 14px 16px;
  border-radius: 12px;
  background: #1f1f1f;
  color: #fff;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
  font-size: 14px;
  line-height: 1.4;
`;

const Text = styled.div`
  flex: 1;
  min-width: 0;
`;

const Actions = styled.div`
  display: flex;
  flex-shrink: 0;
  gap: 8px;
`;

const PrimaryButton = styled.button`
  border: none;
  border-radius: 8px;
  padding: 8px 14px;
  background: #85c37a;
  color: #fff;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: #6aa862;
  }
`;

const SecondaryButton = styled.button`
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 8px;
  padding: 8px 12px;
  background: transparent;
  color: #fff;
  cursor: pointer;

  &:hover {
    border-color: rgba(255, 255, 255, 0.45);
  }
`;

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(DISMISS_KEY) === '1') {
      return;
    }

    if (isIos()) {
      setShowIosHint(true);
      setVisible(true);
      return;
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  }, []);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
    setDeferredPrompt(null);
    setShowIosHint(false);
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);

    if (choice.outcome === 'dismissed') {
      localStorage.setItem(DISMISS_KEY, '1');
    }
  }, [deferredPrompt]);

  if (!visible) return null;

  return (
    <Banner role="dialog" aria-label="Install Service360 app">
      <Text>
        {showIosHint ? (
          <>
            Install Service360: tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>.
          </>
        ) : (
          <>Install Service360 for quick access from your home screen or taskbar.</>
        )}
      </Text>
      <Actions>
        {!showIosHint && (
          <PrimaryButton type="button" onClick={install}>
            Install
          </PrimaryButton>
        )}
        <SecondaryButton type="button" onClick={dismiss}>
          {showIosHint ? 'Got it' : 'Not now'}
        </SecondaryButton>
      </Actions>
    </Banner>
  );
}
