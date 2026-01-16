/**
 * Visual Vehicle Inspection Types
 * Interactive zone-based vehicle inspection system
 */

// ===== Zone Condition Types =====
export type ZoneCondition = 'clean' | 'scratch' | 'dent' | 'crack' | 'broken' | 'missing';
export type ZoneSeverity = 'minor' | 'moderate' | 'severe';
export type ZoneCategory = 'exterior' | 'interior' | 'mechanical';
export type VehicleType = 'sedan' | 'suv' | 'truck';

// ===== Vehicle Mark Types (Free-form marking system) =====
export interface VehicleMark {
  id: string;
  x: number; // percentage X (0-100)
  y: number; // percentage Y (0-100)
  description: string;
  condition?: ZoneCondition;
  severity?: ZoneSeverity;
  photo_urls: string[];
  created_at: string;
  created_by: string;
}

// ===== Zone Definition =====
export interface VehicleZone {
  id: string;
  number: number; // Display number on diagram
  name: string;
  name_ar: string;
  category: ZoneCategory;
  vehicle_types: VehicleType[]; // Which vehicle types this zone applies to
  path: string; // SVG path data
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  badge_position: {
    x: number;
    y: number;
  };
}

// ===== Zone Selection State =====
export interface ZoneSelection {
  zone_id: string;
  zone_name: string;
  zone_name_ar: string;
  category: ZoneCategory;
  condition: ZoneCondition;
  severity: ZoneSeverity;
  description: string;
  photo_urls: string[];
  marked_by: string; // user_id
  marked_at: string; // ISO timestamp
}

// ===== Visual Inspection Data =====
export interface VisualInspectionData {
  vehicle_type: VehicleType;
  zones: ZoneSelection[];
  total_zones_marked: number;
  damaged_zones: number;
  clean_zones: number;
  inspected_by: string;
  inspection_date: string;
}

// ===== Comparison View Types =====
export interface InspectionComparison {
  pickup: VisualInspectionData | null;
  return: VisualInspectionData | null;
  new_damages: ZoneSelection[]; // Zones damaged in return but clean in pickup
  existing_damages: ZoneSelection[]; // Zones damaged in both
  worsened_damages: ZoneSelection[]; // Zones with increased severity
}

// ===== Color Scheme =====
export const ZoneConditionColors: Record<ZoneCondition, string> = {
  clean: '#10b981',      // Green
  scratch: '#f59e0b',    // Yellow/Amber
  dent: '#f97316',       // Orange
  crack: '#ef4444',      // Red
  broken: '#b91c1c',     // Dark Red
  missing: '#6b7280',    // Gray
};

export const ZoneConditionLabels: Record<ZoneCondition, { en: string; ar: string }> = {
  clean: { en: 'Clean', ar: 'سليم' },
  scratch: { en: 'Scratch', ar: 'خدش' },
  dent: { en: 'Dent', ar: 'مثني' },
  crack: { en: 'Crack', ar: 'كسر' },
  broken: { en: 'Broken', ar: 'معطل' },
  missing: { en: 'Missing', ar: 'مفقود' },
};

export const ZoneSeverityLabels: Record<ZoneSeverity, { en: string; ar: string }> = {
  minor: { en: 'Minor', ar: 'طفيف' },
  moderate: { en: 'Moderate', ar: 'متوسط' },
  severe: { en: 'Severe', ar: 'شديد' },
};

// ===== Vehicle Zone Definitions by Category =====

// EXTERIOR ZONES (19)
export const EXTERIOR_ZONES: VehicleZone[] = [
  // Front
  {
    id: 'ext_front_bumper',
    number: 1,
    name: 'Front Bumper',
    name_ar: 'المصد الأمامي',
    category: 'exterior',
    vehicle_types: ['sedan', 'suv', 'truck'],
    path: 'M 100 50 L 200 50 L 200 80 L 100 80 Z',
    position: { x: 100, y: 50, width: 100, height: 30 },
    badge_position: { x: 150, y: 65 },
  },
  {
    id: 'ext_hood',
    number: 2,
    name: 'Hood',
    name_ar: 'الغطاء',
    category: 'exterior',
    vehicle_types: ['sedan', 'suv', 'truck'],
    path: 'M 105 85 L 195 85 L 195 140 L 105 140 Z',
    position: { x: 105, y: 85, width: 90, height: 55 },
    badge_position: { x: 150, y: 112 },
  },
  {
    id: 'ext_front_bumper_left',
    number: 3,
    name: 'Front Bumper Left',
    name_ar: 'المصد الأمامي يسار',
    category: 'exterior',
    vehicle_types: ['sedan', 'suv', 'truck'],
    path: 'M 50 50 L 95 50 L 95 80 L 50 80 Z',
    position: { x: 50, y: 50, width: 45, height: 30 },
    badge_position: { x: 72, y: 65 },
  },
  {
    id: 'ext_front_bumper_right',
    number: 4,
    name: 'Front Bumper Right',
    name_ar: 'المصد الأمامي يمين',
    category: 'exterior',
    vehicle_types: ['sedan', 'suv', 'truck'],
    path: 'M 205 50 L 250 50 L 250 80 L 205 80 Z',
    position: { x: 205, y: 50, width: 45, height: 30 },
    badge_position: { x: 227, y: 65 },
  },
  {
    id: 'ext_front_fender_left',
    number: 5,
    name: 'Front Fender Left',
    name_ar: 'الجناح الأمامي يسار',
    category: 'exterior',
    vehicle_types: ['sedan', 'suv', 'truck'],
    path: 'M 55 85 L 100 85 L 100 180 L 55 180 Z',
    position: { x: 55, y: 85, width: 45, height: 95 },
    badge_position: { x: 77, y: 132 },
  },
  {
    id: 'ext_front_fender_right',
    number: 6,
    name: 'Front Fender Right',
    name_ar: 'الجناح الأمامي يمين',
    category: 'exterior',
    vehicle_types: ['sedan', 'suv', 'truck'],
    path: 'M 200 85 L 245 85 L 245 180 L 200 180 Z',
    position: { x: 200, y: 85, width: 45, height: 95 },
    badge_position: { x: 222, y: 132 },
  },
  {
    id: 'ext_front_door_left',
    number: 7,
    name: 'Front Door Left',
    name_ar: 'الباب الأمامي يسار',
    category: 'exterior',
    vehicle_types: ['sedan', 'suv', 'truck'],
    path: 'M 55 185 L 100 185 L 100 280 L 55 280 Z',
    position: { x: 55, y: 185, width: 45, height: 95 },
    badge_position: { x: 77, y: 232 },
  },
  {
    id: 'ext_front_door_right',
    number: 8,
    name: 'Front Door Right',
    name_ar: 'الباب الأمامي يمين',
    category: 'exterior',
    vehicle_types: ['sedan', 'suv', 'truck'],
    path: 'M 200 185 L 245 185 L 245 280 L 200 280 Z',
    position: { x: 200, y: 185, width: 45, height: 95 },
    badge_position: { x: 222, y: 232 },
  },
  {
    id: 'ext_rear_fender_left',
    number: 9,
    name: 'Rear Fender Left',
    name_ar: 'الجناح الخلفي يسار',
    category: 'exterior',
    vehicle_types: ['sedan', 'suv'],
    path: 'M 55 285 L 100 285 L 100 350 L 55 350 Z',
    position: { x: 55, y: 285, width: 45, height: 65 },
    badge_position: { x: 77, y: 317 },
  },
  {
    id: 'ext_rear_fender_right',
    number: 10,
    name: 'Rear Fender Right',
    name_ar: 'الجناح الخلفي يمين',
    category: 'exterior',
    vehicle_types: ['sedan', 'suv'],
    path: 'M 200 285 L 245 285 L 245 350 L 200 350 Z',
    position: { x: 200, y: 285, width: 45, height: 65 },
    badge_position: { x: 222, y: 317 },
  },
  {
    id: 'ext_rear_door_left',
    number: 11,
    name: 'Rear Door Left',
    name_ar: 'الباب الخلفي يسار',
    category: 'exterior',
    vehicle_types: ['sedan', 'suv'],
    path: 'M 55 230 L 100 230 L 100 280 L 55 280 Z',
    position: { x: 55, y: 230, width: 45, height: 50 },
    badge_position: { x: 77, y: 255 },
  },
  {
    id: 'ext_rear_door_right',
    number: 12,
    name: 'Rear Door Right',
    name_ar: 'الباب الخلفي يمين',
    category: 'exterior',
    vehicle_types: ['sedan', 'suv'],
    path: 'M 200 230 L 245 230 L 245 280 L 200 280 Z',
    position: { x: 200, y: 230, width: 45, height: 50 },
    badge_position: { x: 222, y: 255 },
  },
  {
    id: 'ext_trunk',
    number: 13,
    name: 'Trunk',
    name_ar: 'صندوق الأمتعة',
    category: 'exterior',
    vehicle_types: ['sedan'],
    path: 'M 105 355 L 195 355 L 195 400 L 105 400 Z',
    position: { x: 105, y: 355, width: 90, height: 45 },
    badge_position: { x: 150, y: 377 },
  },
  {
    id: 'ext_tailgate',
    number: 13,
    name: 'Tailgate',
    name_ar: 'باب الصندوق',
    category: 'exterior',
    vehicle_types: ['suv', 'truck'],
    path: 'M 105 355 L 195 355 L 195 400 L 105 400 Z',
    position: { x: 105, y: 355, width: 90, height: 45 },
    badge_position: { x: 150, y: 377 },
  },
  {
    id: 'ext_rear_bumper',
    number: 14,
    name: 'Rear Bumper',
    name_ar: 'المصد الخلفي',
    category: 'exterior',
    vehicle_types: ['sedan', 'suv', 'truck'],
    path: 'M 100 405 L 200 405 L 200 430 L 100 430 Z',
    position: { x: 100, y: 405, width: 100, height: 25 },
    badge_position: { x: 150, y: 417 },
  },
  {
    id: 'ext_roof',
    number: 15,
    name: 'Roof',
    name_ar: 'السقف',
    category: 'exterior',
    vehicle_types: ['sedan', 'suv', 'truck'],
    path: 'M 105 145 L 195 145 L 195 280 L 105 280 Z',
    position: { x: 105, y: 145, width: 90, height: 135 },
    badge_position: { x: 150, y: 212 },
  },
  {
    id: 'ext_windshield',
    number: 16,
    name: 'Windshield',
    name_ar: 'الزجاج الأمامي',
    category: 'exterior',
    vehicle_types: ['sedan', 'suv', 'truck'],
    path: 'M 110 55 L 190 55 L 190 80 L 110 80 Z',
    position: { x: 110, y: 55, width: 80, height: 25 },
    badge_position: { x: 150, y: 67 },
  },
  {
    id: 'ext_window_front_left',
    number: 17,
    name: 'Front Window Left',
    name_ar: 'النافذة الأمامية يسار',
    category: 'exterior',
    vehicle_types: ['sedan', 'suv', 'truck'],
    path: 'M 60 90 L 95 90 L 95 180 L 60 180 Z',
    position: { x: 60, y: 90, width: 35, height: 90 },
    badge_position: { x: 77, y: 135 },
  },
  {
    id: 'ext_window_front_right',
    number: 18,
    name: 'Front Window Right',
    name_ar: 'النافذة الأمامية يمين',
    category: 'exterior',
    vehicle_types: ['sedan', 'suv', 'truck'],
    path: 'M 205 90 L 240 90 L 240 180 L 205 180 Z',
    position: { x: 205, y: 90, width: 35, height: 90 },
    badge_position: { x: 222, y: 135 },
  },
  {
    id: 'ext_window_rear_left',
    number: 19,
    name: 'Rear Window Left',
    name_ar: 'النافذة الخلفية يسار',
    category: 'exterior',
    vehicle_types: ['sedan', 'suv'],
    path: 'M 60 190 L 95 190 L 95 270 L 60 270 Z',
    position: { x: 60, y: 190, width: 35, height: 80 },
    badge_position: { x: 77, y: 230 },
  },
  {
    id: 'ext_window_rear_right',
    number: 20,
    name: 'Rear Window Right',
    name_ar: 'النافذة الخلفية يمين',
    category: 'exterior',
    vehicle_types: ['sedan', 'suv'],
    path: 'M 205 190 L 240 190 L 240 270 L 205 270 Z',
    position: { x: 205, y: 190, width: 35, height: 80 },
    badge_position: { x: 222, y: 230 },
  },
  {
    id: 'ext_mirror_left',
    number: 21,
    name: 'Mirror Left',
    name_ar: 'المرآة يسار',
    category: 'exterior',
    vehicle_types: ['sedan', 'suv', 'truck'],
    path: 'M 45 120 L 55 120 L 55 150 L 45 150 Z',
    position: { x: 45, y: 120, width: 10, height: 30 },
    badge_position: { x: 50, y: 135 },
  },
  {
    id: 'ext_mirror_right',
    number: 22,
    name: 'Mirror Right',
    name_ar: 'المرآة يمين',
    category: 'exterior',
    vehicle_types: ['sedan', 'suv', 'truck'],
    path: 'M 245 120 L 255 120 L 255 150 L 245 150 Z',
    position: { x: 245, y: 120, width: 10, height: 30 },
    badge_position: { x: 250, y: 135 },
  },
];

// VEHICLE ZONES - Simplified to 10 major zones only
// Based on clean sedan top view (sedan-top-view.png)
// Coordinates based on 500x500 canvas system
export const INTERIOR_ZONES: VehicleZone[] = [
  // Zone 1: Front Bumper
  {
    id: 'zone_front_bumper',
    number: 1,
    name: 'Front Bumper',
    name_ar: 'المصد الأمامي',
    category: 'exterior',
    vehicle_types: ['sedan'],
    path: 'M 200 20 L 300 20 L 300 50 L 200 50 Z',
    position: { x: 200, y: 20, width: 100, height: 30 },
    badge_position: { x: 250, y: 35 },
  },

  // Zone 2: Hood
  {
    id: 'zone_hood',
    number: 2,
    name: 'Hood',
    name_ar: 'الغطاء',
    category: 'exterior',
    vehicle_types: ['sedan'],
    path: 'M 180 55 L 320 55 L 320 120 L 180 120 Z',
    position: { x: 180, y: 55, width: 140, height: 65 },
    badge_position: { x: 250, y: 87 },
  },

  // Zone 3: Windshield
  {
    id: 'zone_windshield',
    number: 3,
    name: 'Windshield',
    name_ar: 'الزجاج الأمامي',
    category: 'exterior',
    vehicle_types: ['sedan'],
    path: 'M 200 125 L 300 125 L 300 160 L 200 160 Z',
    position: { x: 200, y: 125, width: 100, height: 35 },
    badge_position: { x: 250, y: 142 },
  },

  // Zone 4: Roof
  {
    id: 'zone_roof',
    number: 4,
    name: 'Roof',
    name_ar: 'السقف',
    category: 'exterior',
    vehicle_types: ['sedan'],
    path: 'M 180 170 L 320 170 L 320 290 L 180 290 Z',
    position: { x: 180, y: 170, width: 140, height: 120 },
    badge_position: { x: 250, y: 230 },
  },

  // Zone 5: Front Left Door/Fender (combined)
  {
    id: 'zone_front_left',
    number: 5,
    name: 'Front Left Door/Fender',
    name_ar: 'الباب/الجناح الأمامي الأيسر',
    category: 'exterior',
    vehicle_types: ['sedan'],
    path: 'M 80 55 L 175 55 L 175 240 L 80 240 Z',
    position: { x: 80, y: 55, width: 95, height: 185 },
    badge_position: { x: 127, y: 147 },
  },

  // Zone 6: Front Right Door/Fender (combined)
  {
    id: 'zone_front_right',
    number: 6,
    name: 'Front Right Door/Fender',
    name_ar: 'الباب/الجناح الأمامي الأيمن',
    category: 'exterior',
    vehicle_types: ['sedan'],
    path: 'M 325 55 L 420 55 L 420 240 L 325 240 Z',
    position: { x: 325, y: 55, width: 95, height: 185 },
    badge_position: { x: 372, y: 147 },
  },

  // Zone 7: Rear Left Door/Fender (combined)
  {
    id: 'zone_rear_left',
    number: 7,
    name: 'Rear Left Door/Fender',
    name_ar: 'الباب/الجناح الخلفي الأيسر',
    category: 'exterior',
    vehicle_types: ['sedan'],
    path: 'M 80 245 L 175 245 L 175 400 L 80 400 Z',
    position: { x: 80, y: 245, width: 95, height: 155 },
    badge_position: { x: 127, y: 322 },
  },

  // Zone 8: Rear Right Door/Fender (combined)
  {
    id: 'zone_rear_right',
    number: 8,
    name: 'Rear Right Door/Fender',
    name_ar: 'الباب/الجناح الخلفي الأيمن',
    category: 'exterior',
    vehicle_types: ['sedan'],
    path: 'M 325 245 L 420 245 L 420 400 L 325 400 Z',
    position: { x: 325, y: 245, width: 95, height: 155 },
    badge_position: { x: 372, y: 322 },
  },

  // Zone 9: Trunk
  {
    id: 'zone_trunk',
    number: 9,
    name: 'Trunk',
    name_ar: 'صندوق الأمتعة',
    category: 'exterior',
    vehicle_types: ['sedan'],
    path: 'M 180 300 L 320 300 L 320 390 L 180 390 Z',
    position: { x: 180, y: 300, width: 140, height: 90 },
    badge_position: { x: 250, y: 345 },
  },

  // Zone 10: Rear Bumper
  {
    id: 'zone_rear_bumper',
    number: 10,
    name: 'Rear Bumper',
    name_ar: 'المصد الخلفي',
    category: 'exterior',
    vehicle_types: ['sedan'],
    path: 'M 200 400 L 300 400 L 300 440 L 200 440 Z',
    position: { x: 200, y: 400, width: 100, height: 40 },
    badge_position: { x: 250, y: 420 },
  },
];

// MECHANICAL ZONES (12)
export const MECHANICAL_ZONES: VehicleZone[] = [
  {
    id: 'mec_engine',
    number: 50,
    name: 'Engine',
    name_ar: 'المحرك',
    category: 'mechanical',
    vehicle_types: ['sedan', 'suv', 'truck'],
    path: 'M 300 50 L 380 50 L 380 120 L 300 120 Z',
    position: { x: 300, y: 50, width: 80, height: 70 },
    badge_position: { x: 340, y: 85 },
  },
  {
    id: 'mec_transmission',
    number: 51,
    name: 'Transmission',
    name_ar: 'ناقل الحركة',
    category: 'mechanical',
    vehicle_types: ['sedan', 'suv', 'truck'],
    path: 'M 300 130 L 380 130 L 380 180 L 300 180 Z',
    position: { x: 300, y: 130, width: 80, height: 50 },
    badge_position: { x: 340, y: 155 },
  },
  {
    id: 'mec_brakes',
    number: 52,
    name: 'Brakes',
    name_ar: 'المكابح',
    category: 'mechanical',
    vehicle_types: ['sedan', 'suv', 'truck'],
    path: 'M 300 190 L 380 190 L 380 230 L 300 230 Z',
    position: { x: 300, y: 190, width: 80, height: 40 },
    badge_position: { x: 340, y: 210 },
  },
  {
    id: 'mec_suspension',
    number: 53,
    name: 'Suspension',
    name_ar: 'نظام التعليق',
    category: 'mechanical',
    vehicle_types: ['sedan', 'suv', 'truck'],
    path: 'M 300 240 L 380 240 L 380 280 L 300 280 Z',
    position: { x: 300, y: 240, width: 80, height: 40 },
    badge_position: { x: 340, y: 260 },
  },
  {
    id: 'mec_tires',
    number: 54,
    name: 'Tires',
    name_ar: 'الإطارات',
    category: 'mechanical',
    vehicle_types: ['sedan', 'suv', 'truck'],
    path: 'M 300 290 L 380 290 L 380 330 L 300 330 Z',
    position: { x: 300, y: 290, width: 80, height: 40 },
    badge_position: { x: 340, y: 310 },
  },
  {
    id: 'mec_battery',
    number: 55,
    name: 'Battery',
    name_ar: 'البطارية',
    category: 'mechanical',
    vehicle_types: ['sedan', 'suv', 'truck'],
    path: 'M 300 340 L 380 340 L 380 370 L 300 370 Z',
    position: { x: 300, y: 340, width: 80, height: 30 },
    badge_position: { x: 340, y: 355 },
  },
  {
    id: 'mec_oil_level',
    number: 56,
    name: 'Oil Level',
    name_ar: 'مستوى الزيت',
    category: 'mechanical',
    vehicle_types: ['sedan', 'suv', 'truck'],
    path: 'M 300 380 L 380 380 L 380 410 L 300 410 Z',
    position: { x: 300, y: 380, width: 80, height: 30 },
    badge_position: { x: 340, y: 395 },
  },
  {
    id: 'mec_coolant_level',
    number: 57,
    name: 'Coolant Level',
    name_ar: 'مستوى المبرد',
    category: 'mechanical',
    vehicle_types: ['sedan', 'suv', 'truck'],
    path: 'M 300 420 L 380 420 L 380 450 L 300 450 Z',
    position: { x: 300, y: 420, width: 80, height: 30 },
    badge_position: { x: 340, y: 435 },
  },
  {
    id: 'mec_ac_performance',
    number: 58,
    name: 'AC Performance',
    name_ar: 'أداء المكيف',
    category: 'mechanical',
    vehicle_types: ['sedan', 'suv', 'truck'],
    path: 'M 390 50 L 450 50 L 450 100 L 390 100 Z',
    position: { x: 390, y: 50, width: 60, height: 50 },
    badge_position: { x: 420, y: 75 },
  },
  {
    id: 'mec_lights',
    number: 59,
    name: 'Lights Function',
    name_ar: 'عمل الإضاءة',
    category: 'mechanical',
    vehicle_types: ['sedan', 'suv', 'truck'],
    path: 'M 390 110 L 450 110 L 450 150 L 390 150 Z',
    position: { x: 390, y: 110, width: 60, height: 40 },
    badge_position: { x: 420, y: 130 },
  },
  {
    id: 'mec_horn',
    number: 60,
    name: 'Horn',
    name_ar: 'القرن',
    category: 'mechanical',
    vehicle_types: ['sedan', 'suv', 'truck'],
    path: 'M 390 160 L 450 160 L 450 190 L 390 190 Z',
    position: { x: 390, y: 160, width: 60, height: 30 },
    badge_position: { x: 420, y: 175 },
  },
  {
    id: 'mec_wipers',
    number: 61,
    name: 'Wipers',
    name_ar: 'المساحات',
    category: 'mechanical',
    vehicle_types: ['sedan', 'suv', 'truck'],
    path: 'M 390 200 L 450 200 L 450 230 L 390 230 Z',
    position: { x: 390, y: 200, width: 60, height: 30 },
    badge_position: { x: 420, y: 215 },
  },
];

// Helper function to get zones by vehicle type and category
export function getZonesByVehicleType(
  vehicleType: VehicleType,
  category?: ZoneCategory
): VehicleZone[] {
  const allZones = [...EXTERIOR_ZONES, ...INTERIOR_ZONES, ...MECHANICAL_ZONES];

  return allZones.filter(zone => {
    const matchesVehicleType = zone.vehicle_types.includes(vehicleType);
    const matchesCategory = !category || zone.category === category;
    return matchesVehicleType && matchesCategory;
  });
}

// Helper function to get zone by ID
export function getZoneById(zoneId: string): VehicleZone | undefined {
  const allZones = [...EXTERIOR_ZONES, ...INTERIOR_ZONES, ...MECHANICAL_ZONES];
  return allZones.find(zone => zone.id === zoneId);
}
