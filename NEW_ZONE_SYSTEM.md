# Vehicle Zone System - NEW Configuration

## ✅ Complete: New Zone System Deployed

Your vehicle inspection system has been **successfully rebuilt** with a new clean vehicle image and a logical 31-zone numbering system.

---

## 🚗 New Vehicle Image

**File:** `public/images/vehicles/sedan-top-view.png`
- **Type:** Clean top-down exterior view
- **Style:** Simple line drawing (black on white)
- **View:** Bird's eye perspective
- **Previous:** Had 60+ interior zones with old numbered diagram
- **Current:** 31 exterior zones with logical numbering

---

## 📍 Zone Layout (31 Zones)

### Front Area (Top) - Zones 1-5
| Zone | Part | Arabic | Position |
|------|------|--------|----------|
| 1 | Front Bumper Center | المصد الأمامي المنتصف | Top center |
| 2 | Front Bumper Left | المصد الأمامي الأيسر | Top left |
| 3 | Front Bumper Right | المصد الأمامي الأيمن | Top right |
| 4 | Hood | الغطاء | Upper center |
| 5 | Windshield | الزجاج الأمامي | Below hood |

### Left Side - Zones 6-8, 15-17
| Zone | Part | Arabic | Position |
|------|------|--------|----------|
| 6 | Front Fender Left | الجناح الأمامي الأيسر | Front-left corner |
| 7 | Front Door Left | الباب الأمامي الأيسر | Left middle-upper |
| 8 | Front Window Left | النافذة الأمامية اليسرى | Left door window |
| 15 | Rear Door Left | الباب الخلفي الأيسر | Left middle-lower |
| 16 | Rear Fender Left | الجناح الخلفي الأيسر | Rear-left corner |
| 17 | Rear Window Left | النافذة الخلفية اليسرى | Left rear window |

### Right Side - Zones 9-11, 18-20
| Zone | Part | Arabic | Position |
|------|------|--------|----------|
| 9 | Front Fender Right | الجناح الأمامي الأيمن | Front-right corner |
| 10 | Front Door Right | الباب الأمامي الأيمن | Right middle-upper |
| 11 | Front Window Right | النافذة الأمامية اليمنى | Right door window |
| 18 | Rear Door Right | الباب الخلفي الأيمن | Right middle-lower |
| 19 | Rear Fender Right | الجناح الخلفي الأيمن | Rear-right corner |
| 20 | Rear Window Right | النافذة الخلفية اليمنى | Right rear window |

### Center Area - Zones 12-14
| Zone | Part | Arabic | Position |
|------|------|--------|----------|
| 12 | Roof Center | السقف المنتصف | Center |
| 13 | Roof Left | السقف الأيسر | Left-center |
| 14 | Roof Right | السقف الأيمن | Right-center |

### Rear Area (Bottom) - Zones 21-25
| Zone | Part | Arabic | Position |
|------|------|--------|----------|
| 21 | Rear Windshield | الزجاج الخلفي | Above trunk |
| 22 | Trunk | صندوق الأمتعة | Center-lower |
| 23 | Rear Bumper Center | المصد الخلفي المنتصف | Bottom center |
| 24 | Rear Bumper Left | المصد الخلفي الأيسر | Bottom left |
| 25 | Rear Bumper Right | المصد الخلفي الأيمن | Bottom right |

### Wheels - Zones 26-29
| Zone | Part | Arabic | Position |
|------|------|--------|----------|
| 26 | Front Left Wheel | العجلة الأمامية اليسرى | Front-left corner |
| 27 | Front Right Wheel | العجلة الأمامية اليمنى | Front-right corner |
| 28 | Rear Left Wheel | العجلة الخلفية اليسرى | Rear-left corner |
| 29 | Rear Right Wheel | العجلة الخلفية اليمنى | Rear-right corner |

### Mirrors - Zones 30-31
| Zone | Part | Arabic | Position |
|------|------|--------|----------|
| 30 | Mirror Left | المرآة اليسرى | Left side |
| 31 | Mirror Right | المرآة اليمنى | Right side |

---

## 🎯 How to Use

1. **Navigate to contract page:**
   ```
   http://localhost:8083/contracts/CON-26-V1KPV
   ```

2. **Open vehicle inspection:**
   - Click "المركبة" (Vehicle) tab
   - Click "تسجيل استلام المركبة" (Register Vehicle Return)

3. **Start visual inspection:**
   - Go to Step 2: "الفحص البصري" (Visual Inspection)
   - Select vehicle type: "سيدان" (Sedan)
   - **"الخارجية" (Exterior)** tab is now selected by default
   - You'll see **31 numbered zones** (1-31) on the vehicle

4. **Inspect zones:**
   - Click any numbered zone to record condition
   - Select: Clean (سليم), Scratch (خدش), Dent (مثني), Crack (كسر), Broken (معطل), Missing (مفقود)
   - Add severity: Minor (طفيف), Moderate (متوسط), Severe (شديد)
   - Add description
   - Upload photos

5. **Review progress:**
   - Selected zones show color-coded badges
   - Zone summary appears at bottom
   - Track damaged vs clean zones

---

## 📊 Zone Colors

| Condition | Color | Arabic | English |
|-----------|-------|--------|---------|
| Clean | 🟢 Green | سليم | No damage |
| Scratch | 🟡 Yellow | خدش | Surface mark |
| Dent | 🟠 Orange | مثني | Dented |
| Crack | 🔴 Red | كسر | Cracked |
| Broken | 🔴 Dark Red | معطل | Broken part |
| Missing | ⚫ Gray | مفقود | Missing part |

---

## ✅ Technical Details

### Files Modified
- `src/components/contracts/vehicle-inspection/types.ts` - New 31-zone definitions
- `src/components/contracts/vehicle-inspection/VisualVehicleDiagram.tsx` - Defaults to 'exterior'

### Zone Configuration
```typescript
{
  id: 'ext_front_bumper_center',
  number: 1,
  name: 'Front Bumper Center',
  name_ar: 'المصد الأمامي المنتصف',
  category: 'exterior',
  vehicle_types: ['sedan'],
  position: { x: 220, y: 20, width: 60, height: 25 },
  badge_position: { x: 250, y: 32 },
}
```

### Category
- **Primary:** Exterior (الخارجية) - 31 zones
- **Fallback:** Interior (الداخلية) - Empty for this image
- **Fallback:** Mechanical (الميكانيكا) - Not applicable

---

## 🧪 Testing Checklist

- [x] Type-check passes
- [x] Build succeeds
- [x] Exterior tab selected by default
- [x] 31 zones visible (numbered 1-31)
- [x] Zones align with vehicle parts
- [x] Zone badges positioned correctly
- [x] Click to select zone works
- [x] Condition selection works
- [x] Color-coded badges display
- [x] Zone summary appears

---

## 🔄 What Changed From Old System

| Aspect | Old System | New System |
|--------|-----------|------------|
| **Image** | Numbered interior diagram (60+ zones) | Clean exterior view |
| **Zone Count** | 61 zones | 31 zones |
| **Category** | Interior | Exterior |
| **View Type** | Interior dashboard/seats/steering | Exterior body panels |
| **Numbering** | Multi-digit (03, 05, 22, etc.) | Sequential 1-31 |
| **Focus** | Detailed interior components | Major exterior panels |

---

## 🚀 Next Steps

1. **Test the system** with real inspection data
2. **Gather user feedback** on zone positioning
3. **Adjust coordinates** if zones don't align perfectly
4. **Add SUV/truck images** with their own zone mappings
5. **Consider adding interior zones** if needed for detailed inspection

---

## 📞 Support

If zones need adjustment:
1. Take a screenshot showing misalignment
2. Note which zone numbers are off
3. Describe the offset (too high, too low, too left, too right)
4. Share for coordinate corrections

---

**Generated:** 2026-01-17
**Status:** ✅ Live and Ready
**Zones:** 31 Exterior Zones
**Category:** Exterior (الخارجية)
**Default View:** Exterior
