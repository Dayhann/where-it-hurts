'use client';

import { Mic, Square } from 'lucide-react';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { patientCopy } from '@/components/i18n/patient';
import { Ripple } from '@/components/interior/ripple';
import type { Lang, Question, QuestionOption } from '@/contracts/types';
import { buttonVariants } from '@/components/ui/button';
import MatrixOrb from '@/components/ui/matrix-orb';
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
  const copy = patientCopy(lang).chat;
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
    <div className="flex flex-col gap-5">
      <div
        className="flex flex-wrap gap-2.5"
        role="group"
        aria-label={copy.quickAnswers}
      >
        {/* Plain buttons rather than PressDepth: that component paints a
            raised "key cap" slab behind the face at a fixed 9px radius, so a
            pill-shaped face left the slab poking out at the corners. Its
            stone greys are off-palette here too. `.pressable` keeps the
            press feedback, consistently with every other button. */}
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
              buttonVariants({ variant: 'outline' }),
              'h-12 rounded-full px-5 text-base',
              option.id.startsWith('scale_') && 'min-w-12 px-3',
            )}
          >
            {optionLabel(option, lang)}
          </button>
        ))}
      </div>
      <label className="flex flex-col gap-2">
        <span className="text-lg">
          {wantOther ? copy.otherPrompt : copy.ownPrompt}
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
          className="min-h-14 w-full resize-y rounded-xl border border-input bg-card px-4 py-3 text-lg leading-relaxed outline-none transition-shadow focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </label>
      {voiceSupported && (
        <MatrixOrb
          size={44}
          color="#2E2823"
          state={listening ? 'listening' : disabled ? 'thinking' : 'idle'}
          labels={{
            idle: copy.voiceIdle,
            listening: copy.voiceListening,
            thinking: copy.waiting,
          }}
          className="flex-row! gap-3! [&_[role=status]]:text-lg! [&_[role=status]]:text-muted-foreground!"
        />
      )}
      <div
        className={cn('grid gap-3', voiceSupported && 'grid-cols-[auto_1fr]')}
      >
        {voiceSupported && (
          <button
            type="button"
            disabled={disabled}
            aria-pressed={listening}
            aria-label={listening ? copy.stopVoice : copy.startVoice}
            onClick={toggleVoice}
            className={cn(
              buttonVariants({ variant: 'outline', size: 'touch' }),
              'text-lg',
            )}
          >
            {listening ? <Square aria-hidden /> : <Mic aria-hidden />}
            {listening ? copy.stop : copy.speak}
          </button>
        )}
        <Ripple
          disabled={disabled || text.trim().length === 0}
          onPress={() => void sendText()}
          tintClassName="bg-white/30"
          className="min-h-14 rounded-2xl! border-primary! bg-primary! text-lg! text-primary-foreground!"
        >
          {copy.send}
        </Ripple>
      </div>
    </div>
  );
}
