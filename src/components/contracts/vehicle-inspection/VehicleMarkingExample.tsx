/**
 * Example Usage of VehicleMarking Component
 *
 * This is an example of how to use the new free-form vehicle marking system
 * in your VehicleReturnFormDialog or other inspection components.
 */

import { useState } from 'react';
import { VehicleMarking } from './vehicle-inspection';
import { VehicleMark } from './vehicle-inspection/types';

export function VehicleMarkingExample() {
  const [marks, setMarks] = useState<VehicleMark[]>([]);

  const handleAddMark = (mark: Omit<VehicleMark, 'id' | 'created_at' | 'created_by'>) => {
    const newMark: VehicleMark = {
      ...mark,
      id: Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString(),
      created_by: 'current-user-id', // Replace with actual user ID
    };
    setMarks(prev => [...prev, newMark]);
  };

  const handleDeleteMark = (markId: string) => {
    setMarks(prev => prev.filter(m => m.id !== markId));
  };

  return (
    <VehicleMarking
      vehicleImage="/images/vehicles/sedan-top-view.png"
      marks={marks}
      onMarkAdd={handleAddMark}
      onMarkDelete={handleDeleteMark}
      mode="add"
      contractId="contract-123"
    />
  );
}

/*
 * INTEGRATION WITH VehicleReturnFormDialog:
 *
 * In your VehicleReturnFormDialog.tsx, replace the VisualVehicleDiagram
 * component with VehicleMarking:
 *
 * 1. Import the component:
 *    import { VehicleMarking } from './vehicle-inspection';
 *
 * 2. Replace state:
 *    const [vehicleMarks, setVehicleMarks] = useState<VehicleMark[]>([]);
 *
 * 3. Replace the VisualVehicleDiagram component (around line 825) with:
 *
 *    <VehicleMarking
 *      vehicleImage="/images/vehicles/sedan-top-view.png"
 *      marks={vehicleMarks}
 *      onMarkAdd={(mark) => {
 *        const newMark: VehicleMark = {
 *          ...mark,
 *          id: Math.random().toString(36).substr(2, 9),
 *          created_at: new Date().toISOString(),
 *          created_by: user?.id || '',
 *        };
 *        setVehicleMarks(prev => [...prev, newMark]);
 *      }}
 *      onMarkDelete={(markId) => {
 *        setVehicleMarks(prev => prev.filter(m => m.id !== markId));
 *      }}
 *      mode="add"
 *      contractId={contract.id}
 *    />
 *
 * 4. Update the submission data (around line 567) to include marks:
 *
 *    visual_inspection_marks: vehicleMarks,
 *
 * 5. Remove all references to:
 *    - vehicleType state
 *    - visualZones state
 *    - selectedZone state
 *    - isZoneDialogOpen state
 *    - handleZoneClick, handleZoneSave, handleZoneDelete functions
 *    - VehicleConditionDialog component
 *
 * 6. Remove imports:
 *    - VisualVehicleDiagram
 *    - VehicleConditionDialog
 *    - VehicleType, ZoneSelection, VehicleZone
 */
