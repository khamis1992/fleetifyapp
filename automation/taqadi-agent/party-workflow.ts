import type { TaqadiPortal } from './taqadi-page';
import {
  HumanInterventionError,
  type FilingPayload,
} from './types';

export type PartyWorkflowPhase =
  | 'save_parties_draft'
  | 'company_and_defendant'
  | 'representative_last';

type PartyWorkflowPortal = Pick<
  TaqadiPortal,
  | 'savePartiesDraft'
  | 'validateCompanyParty'
  | 'addDefendant'
  | 'validateRepresentativeFirst'
  | 'continueAfterParties'
>;

interface PartyWorkflowOptions {
  stopAfterParties?: boolean;
  onPhase?: (phase: PartyWorkflowPhase) => Promise<void> | void;
}

export async function processTaqadiParties(
  portal: PartyWorkflowPortal,
  payload: FilingPayload,
  options: PartyWorkflowOptions = {},
) {
  // صفحة الأطراف هي الموضع الوحيد الذي يُحفظ فيه النموذج: الحفظ يثبّت المسودة
  // ويفعّل جدول الأطراف، ثم يبدأ تسجيل الأطراف بالترتيب المعتاد.
  await options.onPhase?.('save_parties_draft');
  await portal.savePartiesDraft();

  await options.onPhase?.('company_and_defendant');
  await portal.validateCompanyParty(payload);
  await portal.addDefendant(payload, { continueAfterSave: false });

  await options.onPhase?.('representative_last');
  await portal.validateRepresentativeFirst(payload);

  if (options.stopAfterParties) {
    throw new HumanInterventionError(
      'نجحت تجربة إضافة أطراف الدعوى قبل مراجعة خميس، وتوقف الوكيل قبل مغادرة صفحة الأطراف.',
      'PARTIES_DIAGNOSTIC_COMPLETE',
      { workflowOrder: ['company', 'defendant', 'representative'] },
    );
  }

  await portal.continueAfterParties();
}
