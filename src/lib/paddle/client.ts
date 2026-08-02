'use client';

import { useEffect, useCallback, useRef } from 'react';

export interface PaddleCheckoutConfig {
  items: { priceId: string; quantity: number }[];
  customer?: { email?: string };
  customData?: Record<string, any>;
  successCallback?: (data: any) => void;
  closeCallback?: () => void;
}

export interface PaddleGlobal {
  Initialize: (config: {
    token?: string;
    environment?: string;
    eventCallback: (event: any) => void;
  }) => void;
  Checkout: {
    open: (config: PaddleCheckoutConfig) => void;
  };
}

declare global {
  interface Window {
    Paddle?: PaddleGlobal;
  }
}

export type { PaddleGlobal as PaddleWindow };

export function usePaddle() {
  const initialized = useRef(false);

  const loadPaddle = useCallback(() => {
    if (initialized.current || typeof window === 'undefined') return;
    if (window.Paddle) {
      initialized.current = true;
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.paddle.com/paddle/paddle.js';
    script.async = true;
    script.onload = () => {
      if (window.Paddle) {
        window.Paddle.Initialize({
          token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN,
          environment: process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT || 'sandbox',
          eventCallback: (event) => {
            console.log('Paddle event:', event);
          },
        });
        initialized.current = true;
      }
    };
    document.head.appendChild(script);
  }, []);

  const openCheckout = useCallback(
    (priceId: string, email?: string, customData?: Record<string, any>) => {
      if (!window.Paddle) {
        console.error('Paddle not loaded');
        return;
      }
      window.Paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customer: email ? { email } : undefined,
        customData,
      });
    },
    []
  );

  return { loadPaddle, openCheckout };
}
