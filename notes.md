# Notes: Vehicle Image Zone Analysis

## Image Analysis Results

### Source Image
**File**: `public/images/vehicles/sedan-top-view.png`
**Type**: Technical patent/schematic diagram
**View**: Top-down overhead view
**Content**: Vehicle INTERIOR with numbered zones

### Extracted Zone Numbers

Based on the image analysis, the following numbered zones are visible:

#### Dashboard & Upper Structure (Top Section)
- **Zone 03**: Upper trim area
- **Zone 05**: Front bumper/dash area (right side)
- **Zone 22**: Instrument cluster housing
- **Zone 24**: Upper dashboard trim (left)
- **Zone 25**: Upper dashboard trim (right)
- **Zone 27**: Main dashboard surface
- **Zone 42**: Upper trim (right side)

#### Steering Wheels
- **Zone 0**: Dashboard area behind wheels
- **Zone 14**: Dashboard area
- **Zone 16**: Dashboard area
- **Zone 57**: Left steering wheel area
- **Zone 72**: Left steering wheel controls
- **Zone 73**: Left steering wheel
- **Zone 78**: Right steering wheel area
- **Zone 79**: Right steering wheel controls

#### Front Seats & Door Panels (Middle Section)
- **Zone 10**: Seat backs
- **Zone 12**: Seat backs
- **Zone 30**: Front seat left
- **Zone 31**: Front seat right
- **Zone 35**: Lower door panels
- **Zone 36**: Lower door panels
- **Zone 48**: Left door panel
- **Zone 50**: Right door panel
- **Zone 65**: Door panel lower section
- **Zone 69**: Door panel section
- **Zone 70**: Door panel section
- **Zone 71**: Seat belt buckles/area

#### Center Console (Middle-Lower)
- **Zone 11**: Console front area
- **Zone 13**: Console area
- **Zone 15**: Console side
- **Zone 17**: Console side
- **Zone 20**: Console control area
- **Zone 21**: Console section
- **Zone 37**: Main console
- **Zone 45**: Console lower
- **Zone 52**: Control/storage area
- **Zone 53**: Screen/control module
- **Zone 59**: Console bottom area
- **Zone 64**: Console controls
- **Zone 81**: Highlighted feature area

#### Rear Area (Bottom Section)
- **Zone 04**: Rear section
- **Zone 06**: Rear section
- **Zone 15**: Console back
- **Zone 17**: Console side (repeated)
- **Zone 21**: Console section (repeated)
- **Zone 45**: Console lower (repeated)
- **Zone 59**: Console bottom (repeated)
- **Zone 64**: Console controls (repeated)
- **Zone 71**: Seat belt area (repeated)
- **Zone 74**: Rear left area
- **Zone 75**: Rear center
- **Zone 76**: Rear center
- **Zone 77**: Rear right
- **Zone 89**: Rear section
- **Zone 91**: Rear right
- **Zone 92**: Rear section

### Zone Categorization

Based on the positions in the image:

**INTERIOR ZONES** (Primary focus of this image):
- Seats: 30, 31
- Dashboard: 22, 27, 53
- Steering: 57, 73, 78, 79
- Door Panels: 48, 50
- Center Console: 37, 52, 53
- Controls: 35, 36
- Seat Belts: 71
- Ceiling/Upper: 03, 05, 24, 25, 42

**MECHANICAL-RELATED** (visible in interior):
- Gauges/Instruments: 22
- Controls: 52, 53, 59, 64
- Electrical: 81

### Coordinate Mapping Strategy

Since the image uses a 500x500 coordinate system in our code, we need to map the visible zones to percentage-based coordinates:

**Approach**:
1. Analyze the visual position of each numbered circle
2. Estimate percentage-based coordinates (0-100%)
3. Create clickable zones around each number
4. Match zone IDs to existing structure or create new ones

### Zone Mapping Plan

#### High Priority Zones (Clearly Visible)
1. **Zone 30**: Front seat left - Center-left area
2. **Zone 31**: Front seat right - Center-right area
3. **Zone 22**: Dashboard/Instruments - Top center
4. **Zone 57**: Steering wheel left - Left of center
5. **Zone 73**: Steering wheel left main
6. **Zone 78**: Steering wheel right area
7. **Zone 79**: Steering wheel right main
8. **Zone 48**: Door panel left
9. **Zone 50**: Door panel right
10. **Zone 37**: Center console main

#### Implementation Strategy

1. **Create INTERIOR zones** matching the image numbers exactly
2. **Position badges** at the exact locations of numbered circles
3. **Create clickable areas** around each number
4. **Use the image as background** for interior inspection tab
5. **Keep exterior/mechanical** using SVG fallback

### Key Insights

1. The image is **INTERIOR-ONLY** - no exterior body panels visible
2. **Dual steering wheels** shown (left-hand and right-hand drive positions)
3. **Numbered system** already exists in the image - we should use it!
4. **Zone numbers overlap** in some areas (15, 17, 21, 45, 59, 64 appear twice)
5. **Technical drawing style** makes it perfect for overlay highlights

## Precise Zone Coordinates (Extracted from Image)

### Dashboard & Upper Structure
| Zone | X% | Y% | 500x500 Coord | Description |
|------|-----|-----|---------------|-------------|
| 03 | 50.0 | 10.5 | (250, 53) | Center-top dashboard |
| 05 | 12.5 | 10.5 | (63, 53) | Top-left edge |
| 05 | 87.5 | 10.5 | (438, 53) | Top-right edge |
| 22 | 50.0 | 15.0 | (250, 75) | Center panel |
| 24 | 25.0 | 16.0 | (125, 80) | Left dash section |
| 24 | 75.0 | 16.0 | (375, 80) | Right dash section |
| 25 | 28.0 | 10.0 | (140, 50) | Top-left circular |
| 25 | 72.0 | 10.0 | (360, 50) | Top-right circular |
| 27 | 50.0 | 23.0 | (250, 115) | Main dashboard |
| 80 | 62.0 | 29.0 | (310, 145) | Upper center |

### Steering Wheels
| Zone | X% | Y% | 500x500 Coord | Description |
|------|-----|-----|---------------|-------------|
| 57 | 15.0 | 25.0 | (75, 125) | Left wheel main |
| 57 | 85.0 | 25.0 | (425, 125) | Right wheel main |
| 72 | 15.0 | 27.0 | (75, 135) | Left wheel detail |
| 73 | 15.0 | 26.0 | (75, 130) | Left wheel controls |
| 78 | 85.0 | 26.0 | (425, 130) | Right wheel detail |
| 78 | 85.0 | 27.0 | (425, 135) | Right wheel controls |
| 79 | 88.0 | 21.0 | (440, 105) | Right side element |

### Front Seats & Door Panels
| Zone | X% | Y% | 500x500 Coord | Description |
|------|-----|-----|---------------|-------------|
| 10 | 28.0 | 47.0 | (140, 235) | Left middle panel |
| 12 | 72.0 | 47.0 | (360, 235) | Right middle panel |
| 14 | 28.0 | 32.0 | (140, 160) | Left upper panel |
| 16 | 72.0 | 32.0 | (360, 160) | Right upper panel |
| 30 | 20.0 | 36.0 | (100, 180) | Left upper door |
| 31 | 80.0 | 36.0 | (400, 180) | Right upper door |
| 35 | 20.0 | 53.0 | (100, 265) | Left lower door |
| 36 | 80.0 | 53.0 | (400, 265) | Right lower door |
| 48 | 18.0 | 47.0 | (90, 235) | Left middle struct |
| 50 | 82.0 | 47.0 | (410, 235) | Right middle struct |
| 69 | 78.0 | 58.0 | (390, 290) | Right lower panel |
| 70 | 22.0 | 58.0 | (110, 290) | Left lower panel |
| 71 | 22.0 | 40.0 | (110, 200) | Left vertical |
| 71 | 78.0 | 40.0 | (390, 200) | Right vertical |
| 71 | 22.0 | 82.0 | (110, 410) | Left lower struct |
| 71 | 78.0 | 82.0 | (390, 410) | Right lower struct |

### Center Console
| Zone | X% | Y% | 500x500 Coord | Description |
|------|-----|-----|---------------|-------------|
| 20 | 50.0 | 39.0 | (250, 195) | Center dash |
| 37 | 50.0 | 63.0 | (250, 315) | Main console |
| 52 | 50.0 | 83.0 | (250, 415) | Lower console |
| 53 | 50.0 | 50.0 | (250, 250) | Display/screen |

### Rear & Lower Areas
| Zone | X% | Y% | 500x500 Coord | Description |
|------|-----|-----|---------------|-------------|
| 04 | 50.0 | 87.0 | (250, 435) | Lower center |
| 06 | 25.0 | 94.0 | (125, 470) | Lower left |
| 06 | 75.0 | 94.0 | (375, 470) | Lower right |
| 13 | 75.0 | 66.0 | (375, 330) | Right panel |
| 15 | 28.0 | 78.0 | (140, 390) | Left rear |
| 15 | 72.0 | 78.0 | (360, 390) | Right rear |
| 17 | 75.0 | 77.0 | (375, 385) | Right rear side |
| 21 | 50.0 | 76.0 | (250, 380) | Lower center |
| 45 | 28.0 | 78.0 | (140, 390) | Left rear area |
| 45 | 72.0 | 78.0 | (360, 390) | Right rear area |
| 59 | 45.0 | 89.0 | (225, 445) | Lower center |
| 64 | 72.0 | 94.0 | (360, 470) | Lower right |
| 65 | 28.0 | 67.0 | (140, 335) | Left lower struct |
| 65 | 72.0 | 67.0 | (360, 335) | Right lower struct |
| 74 | 15.0 | 79.0 | (75, 395) | Rear left area |
| 75 | 15.0 | 74.0 | (75, 370) | Rear left circular |
| 76 | 85.0 | 79.0 | (425, 395) | Rear right area |
| 77 | 85.0 | 74.0 | (425, 370) | Rear right circular |
| 81 | 75.0 | 77.0 | (375, 385) | Right lower panel |
| 89 | 52.0 | 93.0 | (260, 465) | Rear center |
| 91 | 32.0 | 93.0 | (160, 465) | Rear left |
| 92 | 50.0 | 91.0 | (250, 455) | Rear center |

## Zone Mapping to 500x500 Coordinate System

All coordinates converted from percentages to 500x500 system:
- X coordinate: (percentage / 100) * 500
- Y coordinate: (percentage / 100) * 500
- Zone size: ~30x30 pixels for click area
- Badge position: Same as zone center

### Next Actions

1. ~~Extract precise coordinates for each numbered zone~~ ✅ DONE
2. Update types.ts with new interior zone definitions
3. Modify VisualVehicleDiagram to use the real image
4. Create click zones that align with numbered circles
5. Test click accuracy and visual feedback
