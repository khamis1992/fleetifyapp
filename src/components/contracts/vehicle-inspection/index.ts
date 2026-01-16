/**
 * Vehicle Inspection Components
 * Interactive visual vehicle inspection system
 */

// Legacy zone-based system
export { VisualVehicleDiagram } from './VisualVehicleDiagram';
export { VehicleConditionDialog } from './VehicleConditionDialog';
export { VehicleComparisonView } from './VehicleComparisonView';

// New free-form marking system
export { VehicleMarking } from './VehicleMarking';
export { MarkDialog } from './MarkDialog';

export type {
  VisualVehicleDiagramProps,
} from './VisualVehicleDiagram';

export type {
  VehicleConditionDialogProps,
} from './VehicleConditionDialog';

export type {
  VehicleComparisonViewProps,
} from './VehicleComparisonView';

export type {
  VehicleMarkingProps,
} from './VehicleMarking';

export type {
  MarkDialogProps,
} from './MarkDialog';

export * from './types';
