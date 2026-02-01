/**
 * Mobile Employee Contracts Page
 * صفحة عقود الموظف
 */

import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEmployeeContracts } from '@/hooks/useEmployeeContracts';
import { MobileEmployeeLayout } from '@/components/mobile/employee/layout/MobileEmployeeLayout';
import { MobileEmployeeHeader } from '@/components/mobile/employee/layout/MobileEmployeeHeader';
import { MobileContractCard } from '@/components/mobile/employee/cards/MobileContractCard';
import type { ContractStatus } from '@/types/mobile-employee.types';

type FilterType = 'all' | ContractStatus;

export const MobileEmployeeContracts: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const showPriorityOnly = searchParams.get('priority') === 'true';

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const { 
    contracts, 
    priorityContracts,
    stats, 
    isLoading, 
    refetch 
  } = useEmployeeContracts({
    search: searchQuery,
    status: activeFilter !== 'all' ? [activeFilter as ContractStatus] : undefined,
  });

  // Display priority contracts if requested
  const displayContracts = showPriorityOnly ? priorityContracts : contracts;

  const filterChips: { id: FilterType; label: string; count?: number }[] = [
    { id: 'all', label: 'الكل', count: stats.totalContracts },
    { id: 'active', label: 'نشط', count: stats.activeContracts },
    { id: 'expired', label: 'منتهي', count: stats.expiredContracts },
    { id: 'suspended', label: 'موقوف', count: stats.suspendedContracts },
    { id: 'under_legal_procedure', label: 'قانوني' },
    { id: 'pending', label: 'معلق' },
    { id: 'cancelled', label: 'ملغي' },
  ];

  const handleCall = (phone?: string) => {
    if (phone) {
      window.location.href = `tel:${phone}`;
    }
  };

  const handlePayment = (contractId: string) => {
    console.log('Open payment modal for:', contractId);
    // TODO: Open payment modal
  };

  const handleNote = (contractId: string) => {
    console.log('Open note modal for:', contractId);
    // TODO: Open note modal
  };

  const handleSchedule = (contractId: string) => {
    console.log('Open schedule modal for:', contractId);
    // TODO: Open schedule modal
  };

  return (
    <MobileEmployeeLayout showFAB showBottomNav>
      <div className="space-y-4">
        {/* Header */}
        <div className="px-4 pt-4">
          <MobileEmployeeHeader
            title={showPriorityOnly ? 'عقود ذات أولوية' : 'العقود'}
            subtitle={`${displayContracts.length} عقد`}
            showBack={showPriorityOnly}
            showNotifications
            showRefresh
            onRefresh={refetch}
          />
        </div>

        {/* Search Bar */}
        <div className="px-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في العقود..."
              className={cn(
                'w-full pr-10 pl-10 py-3 rounded-2xl',
                'bg-white/80 backdrop-blur-xl border border-slate-200/50',
                'focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500',
                'transition-all duration-200'
              )}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Chips */}
        {!showPriorityOnly && (
          <div className="px-4">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {filterChips.map((chip) => (
                <button
                  key={chip.id}
                  onClick={() => setActiveFilter(chip.id)}
                  className={cn(
                    'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2',
                    activeFilter === chip.id
                      ? 'bg-teal-500 text-white shadow-md shadow-teal-500/20'
                      : 'bg-white/80 text-slate-600 border border-slate-200/50 hover:bg-slate-100'
                  )}
                >
                  {chip.label}
                  {chip.count !== undefined && (
                    <span className={cn(
                      'text-xs',
                      activeFilter === chip.id ? 'text-white/80' : 'text-slate-400'
                    )}>
                      {chip.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Contracts List */}
        <div className="px-4 pb-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-sm text-teal-600">جاري التحميل...</p>
              </div>
            </div>
          ) : displayContracts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-2xl p-8 text-center"
            >
              <Filter className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">
                {searchQuery ? 'لا توجد نتائج' : 'لا توجد عقود'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {searchQuery ? 'جرب البحث بكلمات مختلفة' : 'لم يتم تعيين عقود لك بعد'}
              </p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {displayContracts.map((contract, index) => (
                  <motion.div
                    key={contract.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, delay: index * 0.03 }}
                  >
                    <MobileContractCard
                      contract={contract}
                      onClick={() => navigate(`/mobile/employee/contracts/${contract.id}`)}
                      onCall={() => handleCall(contract.customer_phone)}
                      onPayment={() => handlePayment(contract.id)}
                      onNote={() => handleNote(contract.id)}
                      onSchedule={() => handleSchedule(contract.id)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </MobileEmployeeLayout>
  );
};

export default MobileEmployeeContracts;
