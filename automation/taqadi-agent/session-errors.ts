import { HumanInterventionError } from './types';

export function classifyPortalSessionFailure(
  error: unknown,
  currentUrl: string,
  state: { submissionStarted: boolean; caseDraftStarted: boolean },
): unknown {
  if (state.submissionStarted || error instanceof HumanInterventionError) return error;
  let url: URL;
  try { url = new URL(currentUrl); } catch { return error; }
  const isPortalLogin = url.hostname === 'taqadi.sjc.gov.qa'
    && url.pathname.replace(/\/+$/, '') === '/itc/login';
  const isNationalLogin = (url.hostname === 'tawtheeq.gov.qa'
    || url.hostname.endsWith('.tawtheeq.gov.qa')) && url.pathname.startsWith('/idp/');
  if (url.protocol !== 'https:' || (!isPortalLogin && !isNationalLogin)) return error;
  return new HumanInterventionError(
    state.caseDraftStarted
      ? 'انتهت جلسة تقاضي أثناء تعبئة الدعوى. أكمل الدخول، وافتح المسودة المحفوظة لهذه الدعوى، ثم اضغط «متابعة من تقاضي». لن تُنشأ دعوى جديدة.'
      : 'انتهت جلسة تقاضي قبل فتح الدعوى. أكمل الدخول بحساب شركة العراف ثم اضغط «متابعة من تقاضي».',
    'LOGIN_REQUIRED',
    {
      url: currentUrl, resumeSupported: true, existingDraftRequired: state.caseDraftStarted,
      requiredActions: [
        'إكمال الدخول بحساب شركة العراف',
        ...(state.caseDraftStarted ? ['فتح المسودة المحفوظة لهذه الدعوى من طلبات تقاضي'] : []),
        'الضغط على «متابعة من تقاضي»',
      ],
    },
  );
}
