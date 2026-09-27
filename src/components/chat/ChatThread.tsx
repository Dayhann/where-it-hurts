'use client';

import { useEffect, useRef, useState } from 'react';
import { patientCopy } from '@/components/i18n/patient';
import { StreamingText } from '@/components/interior/streaming-text';
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
  const [initialIds] = useState(
    () => new Set(messages.map((message) => message.id)),
  );
  const copy = patientCopy(lang).chat;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, typing]);

  return (
    <div
      className="flex max-h-[42vh] flex-col gap-4 overflow-y-auto pr-1"
      role="log"
      aria-live="polite"
      aria-relevant="additions"
    >
      {messages.map((message) => {
        const fromPatient = message.role === 'patient';
        const stream = !fromPatient && !initialIds.has(message.id);
        return (
          <div
            key={message.id}
            className={cn(
              'chat-bubble max-w-[86%] px-5 py-3.5 text-lg leading-relaxed',
              fromPatient
                ? 'ms-auto bg-primary text-primary-foreground'
                : 'me-auto bg-secondary text-secondary-foreground',
            )}
          >
            {stream ? (
              <StreamingText
                text={message.text}
                showSkip={false}
                label={copy.typist}
                className="text-lg! leading-7! text-secondary-foreground!"
              />
            ) : (
              message.text
            )}
          </div>
        );
      })}
      <TypingIndicator
        typists={typing ? [copy.typist] : []}
        showLabel={false}
        size={44}
        className="me-auto shrink-0"
      />
      <div ref={endRef} />
    </div>
  );
}
