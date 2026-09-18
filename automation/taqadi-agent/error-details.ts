export interface WorkerErrorDetails {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

const readableText = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  return text && text !== '[object Object]' ? text.slice(0, 2000) : undefined;
};

/** Keep PostgREST diagnostics without serializing payloads, credentials or arbitrary objects. */
export function workerErrorDetails(error: unknown): WorkerErrorDetails {
  const fields = error && typeof error === 'object'
    ? error as Record<string, unknown> : {};
  const rawMessage = readableText(fields.message) || readableText(error);
  const htmlResponse = rawMessage && /<!doctype html|<html[\s>]/i.test(rawMessage);
  const httpCode = htmlResponse ? rawMessage.match(/(?:Error code\s*|\b)(5\d\d)(?:\s*:|\s*<|\b)/i)?.[1] : undefined;
  const code = readableText(fields.code) || httpCode;
  const details = readableText(fields.details);
  const hint = readableText(fields.hint);
  return {
    message: (htmlResponse
      ? `تعذر الاتصال بخادم البيانات مؤقتاً${httpCode ? ` (HTTP ${httpCode})` : ''}؛ أعد المتابعة بعد استقرار الاتصال.`
      : rawMessage)
      || details || hint || 'حدث خطأ غير متوقع؛ راجع تفاصيل مرحلة الوكيل.',
    ...(code && /^[\w-]{1,64}$/.test(code) ? { code } : {}),
    ...(details ? { details } : {}),
    ...(hint ? { hint } : {}),
  };
}

export const describeError = (error: unknown): string => workerErrorDetails(error).message;
