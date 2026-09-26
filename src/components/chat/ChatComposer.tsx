'use client';

import { useRef, useState } from 'react';
import type { Lang, Question, QuestionOption } from '@/contracts/types';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SOMETHING_ELSE, optionLabel, payloadForChip } from './chips';

export function ChatComposer({
  chips,
  question,
  lang,
  disabled,
  onSend,
}: {
  chips: QuestionOption[];
  question?: Question;
  lang: Lang;
  disabled: boolean;
  onSend: (payload: {
    text: string;
    choiceId?: string;
    inputMode: 'text' | 'choice';
  }) => void;
}) {
  const [text, setText] = useState('');
  const [wantOther, setWantOther] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const sendText = () => {
    const next = text.trim();
    if (!next) return;
    onSend({ text: next, inputMode: 'text' });
    setText('');
    setWantOther(false);
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Quick answers"
      >
        {chips.map((option) => (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            onClick={() => {
              if (option.id === SOMETHING_ELSE.id) {
                setWantOther(true);
                inputRef.current?.focus();
                return;
              }
              onSend(payloadForChip(option, lang, question));
              setText('');
              setWantOther(false);
            }}
            className={cn(
              buttonVariants({ variant: 'outline', size: 'touch' }),
              'text-lg',
              option.id.startsWith('scale_') && 'min-w-11 px-3',
            )}
          >
            {optionLabel(option, lang)}
          </button>
        ))}
      </div>
      <label className="flex flex-col gap-2">
        <span className="text-lg">
          {wantOther
            ? 'Type your answer in your own words.'
            : 'Or type your own answer'}
        </span>
        <textarea
          ref={inputRef}
          value={text}
          disabled={disabled}
          rows={2}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              sendText();
            }
          }}
          className="min-h-11 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-lg leading-7 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </label>
      <button
        type="button"
        disabled={disabled || text.trim().length === 0}
        onClick={sendText}
        className={cn(buttonVariants({ size: 'touch' }), 'text-lg')}
      >
        Send
      </button>
    </div>
  );
}
