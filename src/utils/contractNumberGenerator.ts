/**
 * Utility لتوليد أرقام عقود قصيرة وموحدة
 * Format: CNT-YY-XXXX (e.g., CNT-25-0001)
 */

/**
 * توليد رقم عقد قصير
 * @param sequenceNumber رقم التسلسل (اختياري)
 * @returns رقم عقد بصيغة CNT-YY-XXXX
 */
export function generateShortContractNumber(sequenceNumber?: number): string {
  // Get current year (2 digits)
  const year = new Date().getFullYear().toString().slice(-2);
  
  // Use provided sequence or generate random number (1-9999)
  const num = sequenceNumber || (Math.floor(Math.random() * 9999) + 1);
  
  // Format: CNT-YY-XXXX
  return `CNT-${year}-${String(num).padStart(4, '0')}`;
}

/**
 * توليد رقم عقد من backend (يستخدم العدد الفعلي من قاعدة البيانات)
 * @param companyId معرف الشركة
 * @returns رقم عقد فريد
 */
export async function generateContractNumberFromDB(
  companyId: string,
  supabaseClient: any
): Promise<string> {
  try {
    const { data, error } = await supabaseClient
      .rpc('generate_contract_number', { company_id_param: companyId });
    
    if (error) {
      console.error('Error generating contract number from DB:', error);
      // Fallback to random number
      return generateShortContractNumber();
    }
    
    return data;
  } catch (err) {
    console.error('Exception generating contract number:', err);
    // Fallback to random number
    return generateShortContractNumber();
  }
}

/**
 * التحقق من صحة رقم العقد
 * @param contractNumber رقم العقد للتحقق منه
 * @returns true إذا كان الرقم صحيح
 */
export function isValidContractNumber(contractNumber: string): boolean {
  // Format: CNT-YY-XXXX or CON-YY-XXX
  const pattern = /^(CNT|CON)-\d{2}-\d{3,4}$/;
  return pattern.test(contractNumber);
}

/**
 * استخراج معلومات من رقم العقد
 * @param contractNumber رقم العقد
 * @returns معلومات مستخرجة من الرقم
 */
export function parseContractNumber(contractNumber: string): {
  prefix: string;
  year: string;
  sequence: string;
  fullYear?: number;
} | null {
  const match = contractNumber.match(/^(CNT|CON)-(\d{2})-(\d{3,4})$/);
  
  if (!match) return null;
  
  return {
    prefix: match[1],
    year: match[2],
    sequence: match[3],
    fullYear: 2000 + parseInt(match[2])
  };
}

/**
 * أمثلة:
 * 
 * generateShortContractNumber() 
 *   → "CNT-25-0001" أو "CNT-25-1234"
 * 
 * generateShortContractNumber(15)
 *   → "CNT-25-0015"
 * 
 * isValidContractNumber("CNT-25-0001")
 *   → true
 * 
 * isValidContractNumber("CNT-1760811949736-H60Z96")
 *   → false
 * 
 * parseContractNumber("CNT-25-0001")
 *   → { prefix: "CNT", year: "25", sequence: "0001", fullYear: 2025 }
 */

