/**
 * Vehicle Reservation System Page
 * نظام إدارة الحجوزات المتكامل
 */

import CarRentalScheduler from '@/components/fleet/CarRentalScheduler';

export default function ReservationSystem() {
  return (
    <div className="min-h-screen bg-[#F6F8FB]" dir="rtl">
      <div className="p-4 sm:p-6 lg:p-8">
        <CarRentalScheduler />
      </div>
    </div>
  );
}
