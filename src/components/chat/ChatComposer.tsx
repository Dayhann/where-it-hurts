'use client';

import { Mic, Square } from 'lucide-react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { Lang, Question, QuestionOption } from '@/contracts/types';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SOMETHING_ELSE, optionLabel, payloadForChip } from './chips';
import {
  recognitionLanguage,
  recognitionTranscript,
  type BrowserSpeechRecognition,
} from './voice';

const subscribeToVoiceSupport = () => () => undefined;
const voiceSupportSnapshot = () =>
  Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
const voiceSupportServerSnapshot = () => false;

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
    inputMode: 'text' | 'voice' | 'choice';
  }) => Promise<boolean>;
}) {
  const [text, setText] = useState('');
  const [wantOther, setWantOther] = useState(false);
  const [listening, setListening] = useState(false);
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const voiceBase = useRef('');
  const voiceSupported = useSyncExternalStore(
    subscribeToVoiceSupport,
    voiceSupportSnapshot,
    voiceSupportServerSnapshot,
  );

  useEffect(
    () => () => {
      recognitionRef.current?.stop();
    },
    [],
  );

  const sendText = async () => {
    const next = text.trim();
    if (!next) return;
    recognitionRef.current?.stop();
    const sent = await onSend({ text: next, inputMode });
    if (sent) {
      setText('');
      setWantOther(false);
      setInputMode('text');
    }
  };

  const toggleVoice = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const Recognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return;

    const recognition = new Recognition();
    recognition.lang = recognitionLanguage(lang);
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = recognitionTranscript(event);
      const prefix = voiceBase.current.trim();
      setText([prefix, transcript].filter(Boolean).join(' '));
      setInputMode('voice');
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    voiceBase.current = text;
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
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
            onClick={async () => {
              if (option.id === SOMETHING_ELSE.id) {
                setWantOther(true);
                inputRef.current?.focus();
                return;
              }
              const sent = await onSend(payloadForChip(option, lang, question));
              if (sent) {
                setText('');
                setWantOther(false);
                setInputMode('text');
              }
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
          onChange={(event) => {
            setText(event.target.value);
            setInputMode('text');
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void sendText();
            }
          }}
          className="min-h-11 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-lg leading-7 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </label>
      <div
        className={cn('grid gap-2', voiceSupported && 'grid-cols-[auto_1fr]')}
      >
        {voiceSupported && (
          <button
            type="button"
            disabled={disabled}
            aria-pressed={listening}
            aria-label={listening ? 'Stop voice input' : 'Start voice input'}
            onClick={toggleVoice}
            className={cn(
              buttonVariants({ variant: 'outline', size: 'touch' }),
              'text-lg',
            )}
          >
            {listening ? <Square aria-hidden /> : <Mic aria-hidden />}
            {listening ? 'Stop' : 'Speak'}
          </button>
        )}
        <button
          type="button"
          disabled={disabled || text.trim().length === 0}
          onClick={() => void sendText()}
          className={cn(buttonVariants({ size: 'touch' }), 'text-lg')}
        >
          Send
        </button>
      </div>
    </div>
  );
}
