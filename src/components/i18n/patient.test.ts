import { describe, expect, it } from 'vitest';
import { patientCopy } from './patient';

describe('patientCopy', () => {
  it('keeps English and Arabic carer pronouns distinct', () => {
    expect(patientCopy('en').checkin.bodyTitleCarer).toContain('for them');
    expect(patientCopy('en').body.left).toBe('Left');
    expect(patientCopy('en').body.right).toBe('Right');
    expect(patientCopy('ar').home.carer).toBe('أجيب نيابةً عن شخص آخر');
    expect(patientCopy('ar').redFlag.call).toBe('اتصل بالرقم 000');
  });
});
