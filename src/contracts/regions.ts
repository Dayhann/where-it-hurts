import type { Lang, RegionId } from './types';

/** Draft Arabic labels — Ahmed to check before the Arabic demo. */
export type RegionGroup =
  | 'neck'
  | 'chest'
  | 'abdomen'
  | 'back'
  | 'shoulder'
  | 'elbow'
  | 'wrist'
  | 'hip'
  | 'knee'
  | 'ankle';

export type RegionSide = 'left' | 'right' | 'midline';

export interface Region {
  id: RegionId;
  label: Record<Lang, string>;
  group: RegionGroup;
  side: RegionSide;
  /** Model-space anchor. Filled by A-03 calibration (`?calibrate=1`). */
  anchor: [number, number, number] | null;
}

function region(
  id: RegionId,
  en: string,
  ar: string,
  group: RegionGroup,
  side: RegionSide,
): Region {
  return { id, label: { en, ar }, group, side, anchor: null };
}

export const REGIONS: readonly Region[] = [
  region('neck', 'Neck', 'الرقبة', 'neck', 'midline'),

  region('chest_left', 'Left chest', 'الصدر الأيسر', 'chest', 'left'),
  region('chest_right', 'Right chest', 'الصدر الأيمن', 'chest', 'right'),

  region('abdomen_left', 'Left abdomen', 'البطن الأيسر', 'abdomen', 'left'),
  region('abdomen_right', 'Right abdomen', 'البطن الأيمن', 'abdomen', 'right'),

  region(
    'upper_back_left',
    'Left upper back',
    'أعلى الظهر الأيسر',
    'back',
    'left',
  ),
  region(
    'upper_back_right',
    'Right upper back',
    'أعلى الظهر الأيمن',
    'back',
    'right',
  ),
  region(
    'lower_back_left',
    'Left lower back',
    'أسفل الظهر الأيسر',
    'back',
    'left',
  ),
  region(
    'lower_back_right',
    'Right lower back',
    'أسفل الظهر الأيمن',
    'back',
    'right',
  ),
  region('buttock_left', 'Left buttock', 'الألية اليسرى', 'back', 'left'),
  region('buttock_right', 'Right buttock', 'الألية اليمنى', 'back', 'right'),

  region('shoulder_left', 'Left shoulder', 'الكتف الأيسر', 'shoulder', 'left'),
  region(
    'shoulder_right',
    'Right shoulder',
    'الكتف الأيمن',
    'shoulder',
    'right',
  ),
  region(
    'upper_arm_left',
    'Left upper arm',
    'أعلى الذراع الأيسر',
    'shoulder',
    'left',
  ),
  region(
    'upper_arm_right',
    'Right upper arm',
    'أعلى الذراع الأيمن',
    'shoulder',
    'right',
  ),

  region('elbow_left', 'Left elbow', 'المرفق الأيسر', 'elbow', 'left'),
  region('elbow_right', 'Right elbow', 'المرفق الأيمن', 'elbow', 'right'),
  region('forearm_left', 'Left forearm', 'الساعد الأيسر', 'elbow', 'left'),
  region('forearm_right', 'Right forearm', 'الساعد الأيمن', 'elbow', 'right'),

  region(
    'wrist_hand_left',
    'Left wrist and hand',
    'الرسغ واليد اليسرى',
    'wrist',
    'left',
  ),
  region(
    'wrist_hand_right',
    'Right wrist and hand',
    'الرسغ واليد اليمنى',
    'wrist',
    'right',
  ),

  region('hip_left', 'Left hip', 'الورك الأيسر', 'hip', 'left'),
  region('hip_right', 'Right hip', 'الورك الأيمن', 'hip', 'right'),
  region(
    'thigh_front_left',
    'Front of left thigh',
    'مقدمة الفخذ الأيسر',
    'hip',
    'left',
  ),
  region(
    'thigh_front_right',
    'Front of right thigh',
    'مقدمة الفخذ الأيمن',
    'hip',
    'right',
  ),
  region(
    'thigh_back_left',
    'Back of left thigh',
    'خلف الفخذ الأيسر',
    'back',
    'left',
  ),
  region(
    'thigh_back_right',
    'Back of right thigh',
    'خلف الفخذ الأيمن',
    'back',
    'right',
  ),

  region('knee_left', 'Left knee', 'الركبة اليسرى', 'knee', 'left'),
  region('knee_right', 'Right knee', 'الركبة اليمنى', 'knee', 'right'),
  region('shin_left', 'Left shin', 'مقدمة الساق اليسرى', 'knee', 'left'),
  region('shin_right', 'Right shin', 'مقدمة الساق اليمنى', 'knee', 'right'),

  region('calf_left', 'Left calf', 'بطة الساق اليسرى', 'back', 'left'),
  region('calf_right', 'Right calf', 'بطة الساق اليمنى', 'back', 'right'),

  region(
    'ankle_foot_left',
    'Left ankle and foot',
    'الكاحل والقدم اليسرى',
    'ankle',
    'left',
  ),
  region(
    'ankle_foot_right',
    'Right ankle and foot',
    'الكاحل والقدم اليمنى',
    'ankle',
    'right',
  ),
];

export const REGION_BY_ID: Readonly<Record<string, Region>> =
  Object.fromEntries(REGIONS.map((r) => [r.id, r]));

export function regionGroupFor(regionId: RegionId): RegionGroup | undefined {
  return REGION_BY_ID[regionId]?.group;
}
