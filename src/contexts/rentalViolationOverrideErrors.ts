export class RentalEligibilityConfirmationCancelledError extends Error {
  constructor() {
    super('تم إلغاء إنشاء العقد قبل الموافقة على تنبيه المخالفات');
    this.name = 'RentalEligibilityConfirmationCancelledError';
  }
}
