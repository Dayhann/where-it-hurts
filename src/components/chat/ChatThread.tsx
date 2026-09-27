'use client';

import { useEffect, useRef } from 'react';
import { patientCopy } from '@/components/i18n/patient';
import { TypingIndicator } from '@/components/interior/typing-indicator';
import type { Lang, Message } from '@/contracts/types';
import { cn } from '@/lib/utils';

export function ChatThread({
  messages,
  typing,
  lang,
}: {
  messages: Message[];
  typing: boolean;
  lang: Lang;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  const copy = patientCopy(lang).chat;

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
              'chat-bubble max-w-[85%] rounded-2xl px-4 py-3 text-lg leading-7',
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
        <TypingIndicator
          active
          label={copy.waiting}
          size={48}
          className="me-auto"
        />
      )}
      <div ref={endRef} />
    </div>
  );
}
