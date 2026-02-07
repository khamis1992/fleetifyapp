export const isValidQatarQID = (qid: string | null | undefined): boolean => {
  if (!qid) return false;
  const cleanQID = qid.replace(/\D/g, '');
  return cleanQID.length === 11;
};

export const isValidQatarPhone = (phone: string | null | undefined): boolean => {
  if (!phone) return false;
  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.startsWith('974')) {
    const localNumber = cleanPhone.substring(3);
    return localNumber.length === 8 && /^[3567]/.test(localNumber);
  }
  return cleanPhone.length === 8 && /^[3567]/.test(cleanPhone);
};
