import React from 'react';
import { DeleteDuplicateCustomers } from '@/components/customers/DeleteDuplicateCustomers';

export const DeleteDuplicatesPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <DeleteDuplicateCustomers />
    </div>
  );
};