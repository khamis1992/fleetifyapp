import Anthropic from '@anthropic-ai/sdk';
import { agentConfig } from './config';
import type { PortalObservation } from './portal-observer';
import { normalizeArabic } from './portal-stage';

// Level 2 — navigation advisor. When the perception loop lands on an
// 'unknown' page, this module asks Claude to pick the ONE visible button or
// link that moves the portal back toward the lawsuit draft flow. The advisor
// only suggests navigation clicks; it can never submit, approve, delete or
// pay — dangerous labels are rejected deterministically before any click,
// and the target text must match a visible button/link exactly.

export interface NavigationProposal {
  found: boolean;
  targetText: string | null;
  targetKind: 'button' | 'link' | null;
  confidence: 'high' | 'medium' | 'low';
  rationale: string;
}

export interface NavigationVerification {
  verified: boolean;
  targetText: string | null;
  targetKind: 'button' | 'link' | null;
  reason: string;
}

// أفعال لا يجوز للمستشار اقتراحها أبدًا — الاعتماد النهائي وأي فعل مالي أو
// هدّام يبقى حتميًا بعيدًا عن أي قرار LLM.
const DANGEROUS_TARGET_PATTERNS = [
  'اعتماد',
  'تقديم',
  'ارسال',
  'حذف',
  'الغاء',
  'سداد',
  'دفع',
  'نهائي',
  'رفع الدعوي',
];

export function isDangerousNavigationTarget(text: string): boolean {
  const normalized = normalizeArabic(text);
  return DANGEROUS_TARGET_PATTERNS.some((pattern) => normalized.includes(pattern));
}

const proposalSchema = {
  type: 'object',
  properties: {
    found: {
      type: 'boolean',
      description:
        'true only when a visible button or link plausibly leads toward the lawsuit draft flow',
    },
    targetText: {
      type: 'string',
      description: 'The exact visible text of the button or link to click',
    },
    targetKind: { type: 'string', enum: ['button', 'link'] },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    rationale: {
      type: 'string',
      description: 'One sentence, in Arabic, explaining why this target leads to the draft',
    },
  },
  required: ['found', 'targetText', 'targetKind', 'confidence', 'rationale'],
  additionalProperties: false,
} as const;

export function navigationAdvisorEnabled(): boolean {
  return Boolean(agentConfig.healer.apiKey);
}

export function buildNavigationPrompt(input: {
  goalDescription: string;
  observation: PortalObservation;
}): string {
  const { observation } = input;
  return [
    'An automation worker is filing a lawsuit in the Qatari Taqadi court portal.',
    'It lost track of where it is: the current page did not match any known draft stage.',
    `Goal: ${input.goalDescription}`,
    '',
    `Current URL: ${observation.url}`,
    `Page title: ${observation.title}`,
    `Headings: ${JSON.stringify(observation.headings)}`,
    `Active tabs: ${JSON.stringify(observation.activeTabs)}`,
    `Visible buttons: ${JSON.stringify(observation.buttons)}`,
    `Visible links: ${JSON.stringify(observation.links)}`,
    `Open dialogs: ${JSON.stringify(observation.dialogs)}`,
    '',
    'Pick the single button or link whose click most likely returns the worker',
    'to the lawsuit draft flow (classification/details/parties/documents).',
    'Prefer draft/case-management navigation such as "إدارة القضايا" or "مسوداتي".',
    'Never pick submission, approval, payment, or deletion actions.',
    'If nothing plausible is visible, set found=false.',
  ].join('\n');
}

export function toNavigationProposal(raw: unknown): NavigationProposal | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  const targetText = typeof value.targetText === 'string' && value.targetText.trim()
    ? value.targetText.trim()
    : null;
  const targetKind = value.targetKind === 'button' || value.targetKind === 'link'
    ? value.targetKind
    : null;
  const found = value.found === true && Boolean(targetText) && Boolean(targetKind);
  const confidence = value.confidence === 'high' || value.confidence === 'medium'
    ? value.confidence
    : 'low';
  return {
    found,
    targetText: found ? targetText : null,
    targetKind: found ? targetKind : null,
    confidence,
    rationale: typeof value.rationale === 'string' ? value.rationale : '',
  };
}

/**
 * التحقق الحتمي قبل أي نقرة: الهدف يجب أن يطابق نص زر أو رابط ظاهر حرفيًا
 * (بعد التطبيع العربي)، وألا يكون من الأفعال المحظورة.
 */
export function verifyNavigationTarget(
  proposal: NavigationProposal,
  observation: PortalObservation,
): NavigationVerification {
  if (!proposal.found || !proposal.targetText || !proposal.targetKind) {
    return {
      verified: false,
      targetText: null,
      targetKind: null,
      reason: 'المستشار لم يجد هدفًا صالحًا',
    };
  }

  if (isDangerousNavigationTarget(proposal.targetText)) {
    return {
      verified: false,
      targetText: null,
      targetKind: null,
      reason: `هدف محظور (فعل خطر): ${proposal.targetText}`,
    };
  }

  const wanted = normalizeArabic(proposal.targetText);
  const pool = proposal.targetKind === 'button'
    ? observation.buttons
    : observation.links;
  const exact = pool.find((text) => normalizeArabic(text) === wanted);
  if (exact) {
    return {
      verified: true,
      targetText: exact,
      targetKind: proposal.targetKind,
      reason: `تطابق حرفي مع ${proposal.targetKind === 'button' ? 'زر' : 'رابط'} ظاهر`,
    };
  }

  return {
    verified: false,
    targetText: null,
    targetKind: null,
    reason: 'نص الهدف غير موجود حرفيًا بين الأزرار/الروابط الظاهرة',
  };
}

export function shouldFollowAdvisor(
  proposal: NavigationProposal,
  verification: NavigationVerification,
): boolean {
  return proposal.found
    && proposal.confidence === 'high'
    && verification.verified;
}

export async function proposeNavigationAction(input: {
  goalDescription: string;
  observation: PortalObservation;
}): Promise<NavigationProposal | null> {
  if (!navigationAdvisorEnabled()) return null;
  try {
    const client = new Anthropic({ apiKey: agentConfig.healer.apiKey });
    const response = await client.messages.create({
      model: agentConfig.healer.model,
      max_tokens: 4000,
      output_config: {
        format: {
          type: 'json_schema',
          schema: proposalSchema as unknown as Record<string, unknown>,
        },
      },
      messages: [{ role: 'user', content: buildNavigationPrompt(input) }],
    });
    if (response.stop_reason === 'refusal') return null;
    const text = response.content.find((block) => block.type === 'text');
    if (!text || text.type !== 'text') return null;
    return toNavigationProposal(JSON.parse(text.text));
  } catch (error) {
    console.warn('[TaqadiAgent] navigation advisor failed (non-fatal):', error);
    return null;
  }
}
