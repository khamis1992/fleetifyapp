import type { TaqadiPortal } from './taqadi-page';
import {
  HumanInterventionError,
  type FilingPayload,
} from './types';

export type PartyWorkflowPhase =
  | 'save_parties_draft'
  | 'company_session_party'
  | 'company'
  | 'defendant';

type PartyWorkflowPortal = Pick<
  TaqadiPortal,
  | 'savePartiesDraft'
  | 'reconcileCompanySessionParty'
  | 'validateCompanyParty'
  | 'addDefendant'
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

  await options.onPhase?.('company_session_party');
  await portal.reconcileCompanySessionParty();

  await options.onPhase?.('company');
  await portal.validateCompanyParty(payload);
  await options.onPhase?.('defendant');
  await portal.addDefendant(payload, { continueAfterSave: false });

  if (options.stopAfterParties) {
    throw new HumanInterventionError(
      'نجحت تجربة مطابقة الطرف التلقائي والشركة والمدعى عليه، وتوقف الوكيل قبل مغادرة صفحة الأطراف.',
      'PARTIES_DIAGNOSTIC_COMPLETE',
      { workflowOrder: ['company_session_party', 'company', 'defendant'] },
    );
  }

  await portal.continueAfterParties();
}
