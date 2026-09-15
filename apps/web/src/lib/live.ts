'use client';

import { useEffect, useRef } from 'react';
import { apiFetch } from './api';

export interface LiveEvent {
  type: string;
  data: Record<string, unknown>;
}

/**
 * API'nin olay akisini (Server-Sent Events, GET /events) Authorization basligiyla okur.
 * Tarayici EventSource baslik gonderemedigi icin fetch akisi kullanilir. Baglanti koparsa
 * artan beklemeyle yeniden baglanir. Olay sadece "su degisti" bilgisidir; ekran veriyi
 * normal API cagrisiyla yeniden okur.
 */
export function useLiveEvents(onEvent: (event: LiveEvent) => void, enabled = true) {
  const handler = useRef(onEvent);

  useEffect(() => {
    handler.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    let stopped = false;
    let retryMs = 1000;

    async function listen() {
      while (!stopped) {
        try {
          const res = await apiFetch('events', {
            signal: controller.signal,
            headers: { Accept: 'text/event-stream' },
          });
          retryMs = 1000;
          const reader = res.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let end: number;
            while ((end = buffer.indexOf('\n\n')) >= 0) {
              const chunk = buffer.slice(0, end);
              buffer = buffer.slice(end + 2);
              const type = /^event: ?(.+)$/m.exec(chunk)?.[1];
              const data = /^data: ?(.+)$/m.exec(chunk)?.[1];
              if (!type || type === 'ping') continue;
              try {
                handler.current({ type, data: data ? JSON.parse(data) : {} });
              } catch {
                // Bozuk olay govdesi akisi durdurmamali.
              }
            }
          }
        } catch {
          if (stopped || controller.signal.aborted) return;
        }
        if (stopped) return;
        await new Promise((resolve) => setTimeout(resolve, retryMs));
        retryMs = Math.min(retryMs * 2, 30_000);
      }
    }

    void listen();
    return () => {
      stopped = true;
      controller.abort();
    };
  }, [enabled]);
}
