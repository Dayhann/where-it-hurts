'use client';

import { useEffect, useRef } from 'react';
import type { Message } from '@/contracts/types';
import { cn } from '@/lib/utils';

export function ChatThread({
  messages,
  typing,
}: {
  messages: Message[];
  typing: boolean;
}) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, typing]);

  return (
    <div
      className="flex max-h-[40vh] flex-col gap-3 overflow-y-auto pr-1"
      role="log"
      aria-live="polite"
      aria-relevant="additions"
    >
      {messages.map((message) => {
        const fromPatient = message.role === 'patient';
        return (
          <p
            key={message.id}
            className={cn(
              'max-w-[85%] rounded-2xl px-4 py-3 text-lg leading-7',
              fromPatient
                ? 'ms-auto bg-primary text-primary-foreground'
                : 'me-auto bg-secondary text-secondary-foreground',
            )}
          >
            {message.text}
          </p>
        );
      })}
      {typing && (
        <p
          className="me-auto rounded-2xl bg-secondary px-4 py-3 text-lg text-muted-foreground"
          aria-label="Waiting for the next question"
        >
          …
        </p>
      )}
      <div ref={endRef} />
    </div>
  );
}
