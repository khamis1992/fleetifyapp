/**
 * Integration Example: Vehicle Check-In/Check-Out
 *
 * This file shows how to integrate the VehicleCheckInOut component
 * into your contract details page or create standalone inspection pages.
 *
 * COPY AND ADAPT THIS CODE TO YOUR NEEDS
 */

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { VehicleCheckInOut } from '@/components/vehicles/VehicleCheckInOut';
import { useVehicleInspections } from '@/hooks/useVehicleInspections';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ClipboardCheck, ClipboardList, Eye, Download } from 'lucide-react';
import { format } from 'date-fns';

// ============================================================================
// EXAMPLE 1: Integrate into Contract Details Page (Tabs)
// ============================================================================

export function ContractDetailsWithInspections() {
  const { contractId } = useParams<{ contractId: string }>();
  const contract = useContract(contractId); // Your existing hook

  // Fetch inspections
  const { data: inspections } = useVehicleInspections({
    contractId: contractId!,
  });

  const checkInInspection = inspections?.find((i) => i.inspection_type === 'check_in');
  const checkOutInspection = inspections?.find((i) => i.inspection_type === 'check_out');

  return (
    <div className="container mx-auto p-6">
      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">تفاصيل العقد</TabsTrigger>
          <TabsTrigger value="check-in">
            استلام المركبة
            {checkInInspection && (
              <Badge variant="success" className="mr-2">
                تم
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="check-out">
            تسليم المركبة
            {checkOutInspection && (
              <Badge variant="success" className="mr-2">
                تم
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Contract Details Tab */}
        <TabsContent value="details">
          {/* Your existing contract details UI */}
          <Card>
            <CardHeader>
              <CardTitle>معلومات العقد</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Contract info... */}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Check-In Tab */}
        <TabsContent value="check-in">
          {checkInInspection ? (
            // Show existing inspection
            <InspectionViewer inspection={checkInInspection} />
          ) : (
            // Show inspection form
            <VehicleCheckInOut
              contractId={contract.id}
              vehicleId={contract.vehicle_id}
              type="check_in"
              onComplete={() => {
                // Refresh data
                queryClient.invalidateQueries(['contracts', contractId]);
              }}
            />
          )}
        </TabsContent>

        {/* Check-Out Tab */}
        <TabsContent value="check-out">
          {checkOutInspection ? (
            // Show existing inspection
            <InspectionViewer inspection={checkOutInspection} />
          ) : !checkInInspection ? (
            // Must check-in first
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">
                  يجب إتمام استلام المركبة أولاً قبل التسليم
                </p>
              </CardContent>
            </Card>
          ) : (
            // Show inspection form
            <VehicleCheckInOut
              contractId={contract.id}
              vehicleId={contract.vehicle_id}
              type="check_out"
              onComplete={() => {
                // Refresh data
                queryClient.invalidateQueries(['contracts', contractId]);
              }}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// EXAMPLE 2: Standalone Inspection Page (Full Screen)
// ============================================================================

export function CheckInPage() {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();
  const contract = useContract(contractId);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <VehicleCheckInOut
        contractId={contractId!}
        vehicleId={contract.vehicle_id}
        type="check_in"
        onComplete={() => {
          // Navigate back to contract details
          navigate(`/contracts/${contractId}`);
        }}
        onCancel={() => {
          navigate(`/contracts/${contractId}`);
        }}
      />
    </div>
  );
}

export function CheckOutPage() {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();
  const contract = useContract(contractId);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <VehicleCheckInOut
        contractId={contractId!}
        vehicleId={contract.vehicle_id}
        type="check_out"
        onComplete={() => {
          // Navigate back to contract details
          navigate(`/contracts/${contractId}`);
        }}
        onCancel={() => {
          navigate(`/contracts/${contractId}`);
        }}
      />
    </div>
  );
}

// Add routes in your router:
// <Route path="/contracts/:contractId/check-in" element={<CheckInPage />} />
// <Route path="/contracts/:contractId/check-out" element={<CheckOutPage />} />

// ============================================================================
// EXAMPLE 3: Dialog/Modal Approach
// ============================================================================

export function ContractActionsWithInspectionDialog() {
  const { contractId } = useParams<{ contractId: string }>();
  const contract = useContract(contractId);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showCheckOut, setShowCheckOut] = useState(false);

  const { data: inspections } = useVehicleInspections({
    contractId: contractId!,
  });

  const hasCheckIn = inspections?.some((i) => i.inspection_type === 'check_in');
  const hasCheckOut = inspections?.some((i) => i.inspection_type === 'check_out');

  return (
    <div className="flex gap-2">
      {/* Check-In Button */}
      <Dialog open={showCheckIn} onOpenChange={setShowCheckIn}>
        <DialogTrigger asChild>
          <Button disabled={hasCheckIn}>
            <ClipboardCheck className="mr-2 h-4 w-4" />
            استلام المركبة
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>استلام المركبة</DialogTitle>
          </DialogHeader>
          <VehicleCheckInOut
            contractId={contract.id}
            vehicleId={contract.vehicle_id}
            type="check_in"
            onComplete={() => {
              setShowCheckIn(false);
            }}
            onCancel={() => {
              setShowCheckIn(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Check-Out Button */}
      <Dialog open={showCheckOut} onOpenChange={setShowCheckOut}>
        <DialogTrigger asChild>
          <Button disabled={!hasCheckIn || hasCheckOut}>
            <ClipboardList className="mr-2 h-4 w-4" />
            تسليم المركبة
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تسليم المركبة</DialogTitle>
          </DialogHeader>
          <VehicleCheckInOut
            contractId={contract.id}
            vehicleId={contract.vehicle_id}
            type="check_out"
            onComplete={() => {
              setShowCheckOut(false);
            }}
            onCancel={() => {
              setShowCheckOut(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// EXAMPLE 4: Inspection Viewer Component (Read-Only)
// ============================================================================

function InspectionViewer({ inspection }: { inspection: VehicleInspection }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                {inspection.inspection_type === 'check_in' ? 'استلام المركبة' : 'تسليم المركبة'}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                تاريخ الفحص: {format(new Date(inspection.inspection_date), 'yyyy-MM-dd HH:mm')}
              </p>
            </div>
            <Badge variant={inspection.inspection_type === 'check_in' ? 'default' : 'secondary'}>
              {inspection.inspection_type === 'check_in' ? 'استلام' : 'تسليم'}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Inspection Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Fuel Level */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">مستوى الوقود</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{inspection.fuel_level}%</p>
          </CardContent>
        </Card>

        {/* Odometer */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">قراءة العداد</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {inspection.odometer_reading?.toLocaleString()} كم
            </p>
          </CardContent>
        </Card>

        {/* Cleanliness */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">تقييم النظافة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    'h-6 w-6',
                    i < (inspection.cleanliness_rating || 0) && 'fill-yellow-400 text-yellow-400'
                  )}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Photos */}
      {inspection.photo_urls && inspection.photo_urls.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>صور المركبة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {inspection.photo_urls.map((url, index) => (
                <img
                  key={index}
                  src={url}
                  alt={`صورة ${index + 1}`}
                  className="rounded-md w-full h-32 object-cover cursor-pointer hover:opacity-80"
                  onClick={() => window.open(url, '_blank')}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Damages */}
      {inspection.exterior_condition && inspection.exterior_condition.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>الأضرار المسجلة</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {inspection.exterior_condition.map((damage, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Badge variant="outline">{damage.severity}</Badge>
                  <span>{damage.description}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {inspection.notes && (
        <Card>
          <CardHeader>
            <CardTitle>ملاحظات</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{inspection.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Signature */}
      {inspection.customer_signature && (
        <Card>
          <CardHeader>
            <CardTitle>توقيع العميل</CardTitle>
          </CardHeader>
          <CardContent>
            <img
              src={inspection.customer_signature}
              alt="توقيع العميل"
              className="border rounded-md max-w-md"
            />
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          تحميل PDF
        </Button>
        <Button variant="outline">
          <Eye className="mr-2 h-4 w-4" />
          طباعة
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// EXAMPLE 5: Contract List with Inspection Status
// ============================================================================

export function ContractListWithInspectionStatus() {
  return (
    <div className="space-y-4">
      {contracts.map((contract) => (
        <ContractCardWithInspectionBadges key={contract.id} contract={contract} />
      ))}
    </div>
  );
}

function ContractCardWithInspectionBadges({ contract }: { contract: Contract }) {
  const { data: inspections } = useVehicleInspections({
    contractId: contract.id,
  });

  const hasCheckIn = inspections?.some((i) => i.inspection_type === 'check_in');
  const hasCheckOut = inspections?.some((i) => i.inspection_type === 'check_out');

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">{contract.contract_number}</h3>
            <p className="text-sm text-muted-foreground">{contract.customer?.name}</p>
          </div>

          <div className="flex gap-2">
            {hasCheckIn ? (
              <Badge variant="success">تم الاستلام</Badge>
            ) : (
              <Badge variant="outline">لم يتم الاستلام</Badge>
            )}

            {hasCheckOut ? (
              <Badge variant="success">تم التسليم</Badge>
            ) : (
              <Badge variant="outline">لم يتم التسليم</Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// IMPLEMENTATION CHECKLIST
// ============================================================================

/*
□ Run database migration: supabase db push
□ Verify vehicle-documents Storage bucket exists
□ Import VehicleCheckInOut component
□ Import hooks (useVehicleInspections, useCreateInspection)
□ Add to contract details page (choose approach above)
□ Add buttons/actions to trigger inspections
□ Test check-in flow
□ Test check-out flow with comparison
□ Test photo uploads
□ Test signature capture (both modes)
□ Verify RLS policies work
□ Test on mobile devices
□ Update SYSTEM_REFERENCE.md
*/
