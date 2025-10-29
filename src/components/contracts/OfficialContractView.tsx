/**
 * مكون عرض العقد الرسمي لشركة العراف
 * يستخدم عقد العراف القانوني الكامل مع بيانات حقيقية
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Printer } from 'lucide-react';
import { AlarafOfficialContractComplete } from './AlarafOfficialContractComplete';

interface OfficialContractViewProps {
  contract: any;
}

export const OfficialContractView: React.FC<OfficialContractViewProps> = ({
  contract
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* زر الطباعة */}
      <Card className="no-print">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>العقد الرسمي - شركة العراف</span>
            <Button
              onClick={handlePrint}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Printer className="h-4 w-4" />
              طباعة العقد
            </Button>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* العقد القانوني الكامل */}
      <AlarafOfficialContractComplete contract={contract} />
    </div>
  );
};

export default OfficialContractView;
