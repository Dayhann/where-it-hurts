export type Lang = 'en' | 'ar';

export type SocratesSlot =
  | 'site'
  | 'onset'
  | 'character'
  | 'radiation'
  | 'associated'
  | 'timing'
  | 'exacerbating'
  | 'relieving'
  | 'severity'
  | 'meds_tried';

export type RegionId = string; // defined in regions.ts, e.g. 'lower_back_left', 'thigh_back_left'

export interface BodyMark {
  id: string;
  regionId: RegionId;
  point: [number, number, number]; // model-space hit point
  kind: 'pain' | 'spread';
  intensity?: number; // 0–10
  createdAt: string;
}

export interface Message {
  id: string;
  role: 'patient' | 'assistant';
  text: string; // as shown to the patient (their language)
  textEn?: string; // English version for processing (if lang !== 'en')
  questionId?: string; // for assistant messages
  choiceId?: string; // if the patient tapped an option
  inputMode?: 'text' | 'voice' | 'choice';
  createdAt: string;
}

export type FactStatus = 'answered' | 'unsure' | 'denied';
export interface SlotFact {
  slot: SocratesSlot;
  value: string; // short plain-English value, e.g. "worse when sitting"
  status: FactStatus;
  sourceMessageIds: string[]; // must point to patient messages
  quote: string; // exact substring of a source message
}

export interface QuestionOption {
  id: string;
  label: Record<Lang, string>;
}

export interface Question {
  id: string; // e.g. 'Q_EXAC_SIT_STAND'
  slot: SocratesSlot | 'redflag';
  kind: 'open' | 'single' | 'multi' | 'scale' | 'bodymap';
  text: Record<Lang, string>;
  options?: QuestionOption[]; // always includes 'not_sure' + 'something_else' for closed questions
  mandatory?: boolean; // red-flag questions
  appliesTo?: string[]; // region groups, e.g. ['back']
}

export interface RedFlagHit {
  ruleId: string;
  label: string;
  sourceMessageId: string;
}

export type SessionStatus =
  'in_progress' | 'redflag_stopped' | 'awaiting_confirm' | 'confirmed';

export interface Session {
  id: string;
  appointment: {
    patientDisplayName: string;
    clinician: string;
    startsAt: string;
  };
  lang: Lang;
  carerMode: boolean;
  status: SessionStatus;
  marks: BodyMark[];
  messages: Message[];
  facts: SlotFact[];
  askedQuestionIds: string[];
  redFlags: RedFlagHit[];
  bodySnapshots?: { front?: string; back?: string }; // PNG data URLs
  createdAt: string;
}

export interface SummaryLine {
  text: string; // clinical wording, e.g. "Left lower back pain radiating to posterior left thigh"
  slot: SocratesSlot;
  sourceMessageIds: string[];
  quotes: string[]; // the exact patient words shown on tap
  verified: boolean; // validator passed
}

export interface ClinicianSummary {
  sessionId: string;
  redFlags: RedFlagHit[];
  headline: string[]; // max 3 lines (SummaryLine.text of top 3)
  lines: SummaryLine[];
  notAsked: SocratesSlot[];
  unsure: SocratesSlot[];
  clarify: string[]; // 1–3 prompts for the call
  aiLabel: 'AI-drafted from patient answers. Verify before use.';
  generatedAt: string;
}

export interface PatientRecapLine {
  text: string;
  slot: SocratesSlot;
  editable: true;
}

export type AssistantTurn =
  | {
      type: 'question';
      message: Message;
      question: Question;
      progress: { asked: number; estimatedTotal: number };
    }
  | { type: 'redflag_stop'; hits: RedFlagHit[] }
  | { type: 'done' }; // go to recap
