import {
  CLAIM_DISPOSITION_LABELS,
  fixedCompensationRow,
  type LegalClaimRegister,
} from "@/types/legalClaimRegister";
import type { LegalDocumentData } from "./legal-document-generator";

const escape = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        c
      ]!)
  );
const money = (value: number | null) =>
  value == null
    ? "لم يُقدّر بعد"
    : Number(value).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

export function renderClaimRegister(register: LegalClaimRegister): string {
  return `<div class="claim-register" dir="rtl">${(
    ["primary", "alternative", "subsidiary"] as const
  )
    .map((disposition) => {
      const rows = register.rows.filter(
        (row) => row.disposition === disposition && row.status !== "excluded"
      );
      if (!rows.length && disposition !== "primary") return "";
      const rent = rows.find((row) => row.key === "rent_due");
      const rentSettlement =
        rent?.gross_amount != null && rent.deductions != null
          ? `<tr><td>أصل الأجرة المفوترة الداخلة في المطالبة</td><td>الفواتير التي بقي عليها رصيد، قبل خصم السداد الجزئي</td><td>${money(
              rent.gross_amount
            )}</td></tr><tr><td>يخصم: المسدد جزئيًا من هذه الأجرة</td><td>محتسب ضمن صافي الأجرة أدناه، دون خصمه مرة ثانية</td><td>(${money(
              rent.deductions
            )})</td></tr>`
          : "";
      return `<h3>${CLAIM_DISPOSITION_LABELS[disposition]}${
        disposition !== "primary" ? " — لا يضاف إلى إجمالي الأصل" : ""
      }</h3>
      <table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr><th>البند والفترة</th><th>أساس الطلب</th><th>المبلغ (ر.ق.)</th></tr></thead><tbody>${rentSettlement}${rows
        .map(
          (row) => `<tr>
        <td>${escape(row.label)}${
            row.period_from
              ? `<br>${escape(row.period_from)} — ${escape(row.period_to)}`
              : ""
          }</td>
        <td>${escape(row.basis)}${
            row.custom ? `<br>${escape(row.description)}` : ""
          }${
            row.alternative_to
              ? `<br>مرتبط بـ: ${escape(
                  register.rows.find((item) => item.key === row.alternative_to)
                    ?.label || row.alternative_to
                )}`
              : ""
          }${
            row.issues.length ? `<br>${escape(row.issues.join("؛ "))}` : ""
          }</td>
        <td style="white-space:nowrap;direction:ltr">${
          row.status === "incomplete" ? "يحتاج استكمالًا" : money(row.amount)
        }${
            row.custom && Number(row.deductions) > 0
              ? `<br><small>${money(row.gross_amount ?? null)} − ${money(
                  row.deductions ?? 0
                )}</small>`
              : ""
          }</td></tr>`
        )
        .join("")}
      ${
        disposition === "primary"
          ? `<tr class="total-row"><th colspan="2">إجمالي الطلبات الأصلية دون جمع البدائل والاحتياطيات</th><th style="white-space:nowrap">${money(
              register.primary_total
            )}</th></tr>`
          : ""
      }</tbody></table>${rentSettlement ? '<p>يخص هذا البيان الفواتير التي بقي عليها رصيد فقط؛ استُبعدت الفواتير المسددة بالكامل ومدفوعاتها معًا، ولم تدخل الأقساط المستقبلية في المطالبة. المسدد الموضح هنا لا يمثل إجمالي المحصل على العقد.</p>' : ''}`;
    })
    .join("")}<p>المبالغ محددة حتى ${escape(
    register.as_of_date
  )}. تُخصم المدفوعات المحتسبة مرة واحدة، وتُعرض الطلبات البديلة والاحتياطية للفصل فيها دون جمع التعويض عن المنفعة أو الضرر ذاته.</p></div>`;
}

/** Render only requested relief; preparation warnings stay outside the memorandum. */
export function renderClaimRegisterNarrative(data: LegalDocumentData): string {
  const register = data.claimRegister;
  if (!register) return "";
  const section = (title: string, body: string) =>
    `<div class="section"><div class="section-title">${title}</div><div class="section-content">${body}</div></div>`;
  const items = (kinds: string[]) =>
    register.rows.filter(
      (row) => kinds.includes(row.kind) && row.status === "ready"
    );
  const describe = (kinds: string[]) =>
    items(kinds)
      .map(
        (row) =>
          `<p><strong>${escape(row.label)} — ${
            CLAIM_DISPOSITION_LABELS[row.disposition]
          }</strong>: ${escape(row.description)}${
            row.period_from
              ? `، من ${escape(row.period_from)} إلى ${escape(row.period_to)}`
              : ""
          }؛ ${escape(row.basis)}. صافي المطلوب: <strong>${money(
            row.amount
          )}</strong> ريال قطري${
            Number(row.deductions) > 0
              ? `، بعد تنزيل (${money(row.deductions ?? 0)}) من إجمالي (${money(
                  row.gross_amount ?? null
                )})`
              : ""
          }. تؤيده المستندات المدرجة في حافظة المطالبة.</p>`
      )
      .join("");
  const retention = items(["retention"])[0];
  const fixedCompensation = fixedCompensationRow(register);
  const fixedRequest = fixedCompensation
    ? `<p><strong>${escape(fixedCompensation.label)}</strong>: تطلب المدعية مبلغاً إجمالياً ثابتاً قدره <strong>${money(fixedCompensation.amount)}</strong> ريال قطري. ${escape(fixedCompensation.description)}</p>`
    : "";
  const continuing = data.vehicleCustody === "with_defendant";
  const monthly = register.retention_basis === "contract_monthly";
  const materialKinds = ["damages", "independent_damage", "contractual_compensation"];
  const hasMaterialClaims = items(materialKinds).length > 0;
  const hasOpportunityClaim = items(["rental_opportunity"]).length > 0;
  const hasReputationClaim = items(["reputation_material", "reputation_reserve"]).length > 0;
  return (
    section(
      "ثالثاً: الأجرة المستحقة والفسخ ورد المركبة",
      `<p>تستند المدعية إلى المواد (171) و(172) و(607) من القانون المدني بشأن تنفيذ العقد بحسن نية وسداد الأجرة، وإلى المادة (183) بشأن الفسخ عند الإخلال بعد استيفاء الإعذار متى كان واجباً، أو مسار انتهاء العقد الثابت بالمستندات والمبين في الوقائع.</p>${describe(
        ["rent_due", "legal_extension_rent"]
      )}${
        continuing
          ? "<p>تطلب المدعية رد المركبة ومفاتيحها وملحقاتها ومستنداتها، وتحميل المدعى عليه مصروفات الرد الواجبة. وتقصر الأجرة على الفترات التي يبقى فيها سند استحقاقها، وتعويض الاحتباس على ما بعد زوال سند الحيازة بحسب ما يثبت أو تحدده المحكمة، دون الجمع بين الأجرة وتعويض الاحتباس عن الفترة والمنفعة ذاتهما.</p>"
          : ""
      }`
    ) +
    (retention || continuing ? section(
      "رابعاً: التعويض عن احتباس المركبة والحرمان من الانتفاع",
      `<p>تستند المدعية إلى المادة (616) من القانون المدني بشأن الرد عند انتهاء الإيجار والتعويض عن إبقاء العين دون حق، مع مراعاة القيمة الإيجارية والضرر الثابت. يبدأ التعويض من اليوم التالي لتاريخ زوال سند الحيازة المحتسب وينتهي بالرد الفعلي المثبت أو نهاية الحرمان المعتبرة، دون تداخل مع الأجرة.</p>${
        retention
          ? describe(["retention"])
          : ""
      }${
        continuing
          ? `<p>يبقى طلب ما يستجد من تعويض بعد زوال سند الحيازة وحتى الرد المثبت معروضاً، ${
              monthly
                ? `على أساس أجرة العقد الشهرية (${money(
                    data.contractInfo.monthly_rent
                  )}) ريال قطري، وجزء الشهر وفق ${
                    register.retention_proration === "thirty_days"
                      ? "أساس الثلاثين يوماً الموثق، مع عدم تجاوز أجرة شهر كامل"
                      : "أيام الشهر الفعلية"
                  }`
                : "وفق القيمة الإيجارية والضرر اللذين تثبتهما المستندات أو الخبرة"
            }، وخاضعاً لتقدير المحكمة. لا يدخل المستقبل غير المصفى في الإجمالي.</p>`
          : ""
      }`
    ) : "") +
    (hasOpportunityClaim ? section(
      "خامساً: التعويض عن خسارة فرصة تأجير محددة",
      `<p>تستند المطالبة إلى المادة (263) بشأن الخسارة والكسب الفائت المرتبطين بالإخلال، مع مراعاة جدية الفرصة واحتمال تحققها وصافي العائد والمصروفات المتجنبة وإمكان الحد من الضرر.</p>${describe(
            ["rental_opportunity"]
          )}<p>يطرح الطلب بديلاً بقدر تداخله مع الأجرة أو الاحتباس عن المنفعة نفسها، ومستقلاً فقط بقدر ضرر مختلف مؤيد لم يجبر في بند آخر.</p>`
    ) : "") +
    (fixedCompensation || hasMaterialClaims ? section(
      fixedCompensation
        ? "سادساً: التعويض عن الأضرار المادية والمعنوية والحرمان من الانتفاع"
        : "سادساً: التعويض عن الأضرار المادية المستقلة",
      `${fixedRequest}${hasMaterialClaims ? `<p>تقتصر بنود الأضرار والمصاريف المفصلة على الضرر المباشر المستقل المثبت، كالمصروفات الضرورية للرد والإصلاح ونقص القيمة الباقي غير المجبر والكسب الصافي عن مدة إصلاح مستقلة ومعقولة. يستبعد الاستهلاك المعتاد وما جبره التأمين أو الغير، ولا يعاد احتساب أصل الدين كتعويض.</p>${describe(
        materialKinds
      )}${(data.damageCostItems || [])
        .map(
          (item) =>
            `<p>${escape(item.description)}: ${money(
              item.amount
            )} ريال قطري، وفق المستند المؤيد.</p>`
        )
        .join(
          ""
        )}` : ""}${hasMaterialClaims && (data.damageCostItems || []).some(item => ['monetary_delay_damage', 'financing_burden_damage'].includes(item.type || ''))
          ? '<p>التعويض عن الضرر المالي للتأخر في السداد يخضع للمادة (268) وثبوت الإعذار والضرر الإضافي وعلاقته بالتأخر.</p>' : ''}${items(['contractual_compensation']).length
          ? '<p>التعويض الاتفاقي يخضع لرقابة المحكمة وفق المادتين (266) و(267)، دون تكرار الضرر.</p>' : ''}`
    ) : "") +
    (hasReputationClaim ? section(
      "سابعاً: طلب التعويض عن الأضرار المعنوية والاعتبار التجاري",
      `${describe([
            "reputation_material",
            "reputation_reserve",
          ])}<p>يعرض المساس بالاعتبار التجاري على أساس وقائع مستقلة مثبتة، ولا يفترض من مجرد عدم السداد. الطلب الاحتياطي مشروط بما تقضي المحكمة بجوازه للشخص الاعتباري، ولا ينسب ألماً نفسياً للشركة. يبقى الأثر المادي المستقل معروضاً في حدود الطلب وأدلته، دون تعويضين عن الوقائع ذاتها أو تكرار فرصة تأجير سبق جبرها.</p>`
    ) : "")
  );
}

export function claimRegisterRequests(register: LegalClaimRegister): string[] {
  return register.rows
    .filter((row) => row.status === "ready" && Number(row.amount) > 0)
    .map(
      (row) =>
        row.key === 'fixed_general_compensation'
          ? `${CLAIM_DISPOSITION_LABELS[row.disposition]}: ${row.label}، بإلزام المدعى عليه بأن يؤدي للمدعية مبلغ (${money(row.amount)} ريال قطري)، كمبلغ إجمالي ثابت خاضع لتقدير المحكمة، مع عدم تكرار جبر الضرر ذاته.`
          : `${
          CLAIM_DISPOSITION_LABELS[row.disposition]
        }: إلزام المدعى عليه بمبلغ (${money(row.amount)} ريال قطري) عن ${
          row.label
        }${
          row.period_from
            ? ` عن الفترة من ${row.period_from} إلى ${row.period_to}`
            : ""
        }، ${row.basis}${row.custom ? `؛ ${row.description}` : ""}${
          row.disposition === "alternative"
            ? "، على سبيل البديل بقدر التداخل، دون إضافته إلى إجمالي الطلبات الأصلية"
            : row.disposition === "subsidiary"
            ? "، وفق شرط الطلب الاحتياطي وخاضعًا لتقدير المحكمة، دون إضافته إلى إجمالي الأصل"
            : ""
        }.`
    );
}
