import { CustomerDataReviewCenter } from '@/components/customers/CustomerDataReviewCenter';

/**
 * Central review page for AI-extracted customer data proposals
 * (Vision OCR from ID cards attached to contracts).
 */
export default function CustomerDataReview() {
  return (
    <div className="mx-auto w-full max-w-5xl p-4 md:p-6">
      <CustomerDataReviewCenter />
    </div>
  );
}
