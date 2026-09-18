import { describe, expect, it } from 'vitest';
import { normalizeMoiPlate, parseMoiTrafficMail } from '../../../supabase/functions/_shared/traffic-mail-parser';

describe('MOI traffic email parser', () => {
  it('parses radar notices', () => {
    expect(parseMoiTrafficMail('تسجيل المخالفات', 'تم تسجيل مخالفة ردار رقم المركبة : 848014 - خصوصي التاريخ : 2026-08-12 القيمة : 500 ر ق . السرعة المسجلة :90 كلم/ساعة')).toEqual({
      type: 'fine', fineKind: 'radar', plate: '848014', date: '2026-08-12', amount: 500,
      vehicleClass: 'خصوصي', penaltyNumber: undefined, recordedSpeed: 90,
    });
  });

  it('parses traffic notices and pads short plates', () => {
    const notice = parseMoiTrafficMail('تسجيل المخالفات', 'تم تسجيل مخالفة مرورية رقم المركبة : 5900 - ليموزين التاريخ : 2026-08-11 القيمة : 300 ر ق .');
    expect(notice).toMatchObject({ type: 'fine', fineKind: 'traffic', plate: '005900', date: '2026-08-11', amount: 300 });
  });

  it('parses discount expiry without creating a fine shape', () => {
    expect(parseMoiTrafficMail('تسجيل المخالفات', 'المخالفة المرورية المسجلة رقم (خصوصي - 856589) بتاريخ 2026-07-06 تنتهي مدة الخصم بعد 72 ساعة')).toEqual({
      type: 'discount_expiry', plate: '856589', date: '2026-07-06', hoursRemaining: 72, vehicleClass: 'خصوصي',
    });
  });

  it('parses a Street 52 vehicle block', () => {
    expect(parseMoiTrafficMail('حجز مركبة Block Vehicle', 'يرجى مراجعة حجز المركبات في الصناعية شارع رقم 52 لإستلام المركبة رقم 648144.')).toEqual({
      type: 'block_vehicle', plate: '648144', location: 'street_52',
    });
  });

  it('parses a case transfer QID', () => {
    expect(parseMoiTrafficMail('تحويل المخالفات المرورية لمتابعة القضايا', 'يرجى متابعة القضايا للرقم الشخصي: 29263400736')).toEqual({
      type: 'case_transfer', qid: '29263400736',
    });
  });

  it('normalizes Arabic digits and six-digit plates', () => {
    expect(normalizeMoiPlate('٥٩٠٠')).toBe('005900');
  });

  it('rejects impossible dates and non-positive amounts', () => {
    expect(parseMoiTrafficMail(
      'تسجيل المخالفات',
      'تم تسجيل مخالفة مرورية رقم المركبة : 5900 - ليموزين التاريخ : 2026-02-31 القيمة : 300 ر ق .',
    )).toEqual({ type: 'unknown', reason: 'fine_unparseable' });
    expect(parseMoiTrafficMail(
      'تسجيل المخالفات',
      'تم تسجيل مخالفة مرورية رقم المركبة : 5900 - ليموزين التاريخ : 2026-08-11 القيمة : 0 ر ق .',
    )).toEqual({ type: 'unknown', reason: 'fine_unparseable' });
  });
});
