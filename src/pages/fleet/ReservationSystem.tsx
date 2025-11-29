/**
 * Vehicle Reservation System Page - Redesigned
 * 
 * نظام إدارة الحجوزات المتكامل مع:
 * - جدولة الحجوزات التقويمية
 * - إدارة السائقين
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  CalendarDays,
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import CarRentalScheduler from '@/components/fleet/CarRentalScheduler';

// ===== Main Page Component =====
export default function ReservationSystem() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30" dir="rtl">
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-coral-500 via-coral-600 to-orange-500 p-6 sm:p-8 text-white shadow-xl">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 right-0 w-60 h-60 bg-white rounded-full translate-x-1/3 translate-y-1/3" />
            </div>
            
            <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold">نظام الحجوزات المتكامل</h1>
                </div>
                <p className="text-white/80 text-sm sm:text-base max-w-lg">
                  إدارة حجوزات المركبات والسائقين من مكان واحد
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl backdrop-blur-sm">
                  <CalendarDays className="w-5 h-5" />
                  <span className="font-medium">{format(new Date(), 'dd MMMM yyyy', { locale: ar })}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Scheduler */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <CarRentalScheduler />
        </motion.div>
      </div>
    </div>
  );
}
