import { z } from 'zod';
import { REGIONS } from '@/contracts/regions';
import { QuestionSchema } from '@/contracts/schemas';
import type { Question } from '@/contracts/types';
import questionBankJson from '../../../data/question-bank.json';

const requiredRedFlagIds = [
  'RF_SADDLE',
  'RF_BLADDER',
  'RF_BILAT_WEAK',
  'RF_FEVER_TRAUMA',
];
const requiredSlots = [
  'site',
  'onset',
  'character',
  'radiation',
  'associated',
  'timing',
  'exacerbating',
  'relieving',
  'severity',
  'meds_tried',
] as const;
const regionGroups = new Set<string>(REGIONS.map((region) => region.group));

export const QuestionBankSchema = z
  .array(QuestionSchema)
  .min(1)
  .superRefine((questions, ctx) => {
    const ids = new Set<string>();
    const slots = new Set(questions.map((question) => question.slot));

    for (const slot of requiredSlots) {
      if (!slots.has(slot)) {
        ctx.addIssue({
          code: 'custom',
          message: `Missing SOCRATES slot: ${slot}`,
        });
      }
    }
    for (const id of requiredRedFlagIds) {
      if (
        !questions.some((question) => question.id === id && question.mandatory)
      ) {
        ctx.addIssue({
          code: 'custom',
          message: `Missing mandatory red-flag question: ${id}`,
        });
      }
    }

    questions.forEach((question, index) => {
      const path = [index];
      if (ids.has(question.id)) {
        ctx.addIssue({
          code: 'custom',
          path: [...path, 'id'],
          message: 'Duplicate question ID',
        });
      }
      ids.add(question.id);

      for (const lang of ['en', 'ar'] as const) {
        if (!question.text[lang].trim()) {
          ctx.addIssue({
            code: 'custom',
            path: [...path, 'text', lang],
            message: 'Question text is blank',
          });
        }
      }
      if (question.slot === 'redflag' && !question.mandatory) {
        ctx.addIssue({
          code: 'custom',
          path: [...path, 'mandatory'],
          message: 'Red-flag question must be mandatory',
        });
      }
      if (question.mandatory && question.slot !== 'redflag') {
        ctx.addIssue({
          code: 'custom',
          path: [...path, 'mandatory'],
          message: 'Only red-flag questions may be mandatory',
        });
      }

      const closed = question.kind === 'single' || question.kind === 'multi';
      if (closed && !question.options?.length) {
        ctx.addIssue({
          code: 'custom',
          path: [...path, 'options'],
          message: 'Closed question needs options',
        });
      }
      if (closed && question.options) {
        const optionIds = new Set<string>();
        question.options.forEach((option, optionIndex) => {
          if (optionIds.has(option.id)) {
            ctx.addIssue({
              code: 'custom',
              path: [...path, 'options', optionIndex, 'id'],
              message: 'Duplicate option ID',
            });
          }
          optionIds.add(option.id);
          for (const lang of ['en', 'ar'] as const) {
            if (!option.label[lang].trim()) {
              ctx.addIssue({
                code: 'custom',
                path: [...path, 'options', optionIndex, 'label', lang],
                message: 'Option label is blank',
              });
            }
          }
        });
        for (const id of ['not_sure', 'something_else']) {
          if (!optionIds.has(id)) {
            ctx.addIssue({
              code: 'custom',
              path: [...path, 'options'],
              message: `Closed question needs ${id}`,
            });
          }
        }
      }
      question.appliesTo?.forEach((group, groupIndex) => {
        if (!regionGroups.has(group)) {
          ctx.addIssue({
            code: 'custom',
            path: [...path, 'appliesTo', groupIndex],
            message: `Unknown region group: ${group}`,
          });
        }
      });
    });
  });

// Parsed when imported by the mock app during the Next build, and by the engine later.
export const questionBank: Question[] =
  QuestionBankSchema.parse(questionBankJson);
