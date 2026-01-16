# Vehicle Images for Visual Inspection

This directory should contain top-view vehicle images for the visual inspection system.

## Required Images

Place the following images in this directory:

1. **sedan-top-view.png** - Top view of a sedan car
   - Recommended size: 1000x1000px
   - Format: PNG with transparent background
   - View: Top-down (bird's eye view)

2. **suv-top-view.png** - Top view of an SUV
   - Recommended size: 1000x1000px
   - Format: PNG with transparent background
   - View: Top-down (bird's eye view)

3. **truck-top-view.png** - Top view of a truck
   - Recommended size: 1000x1000px
   - Format: PNG with transparent background
   - View: Top-down (bird's eye view)

## Image Guidelines

- **Format**: PNG with transparent background works best
- **Resolution**: Minimum 800x800px, ideal 1000x1000px or higher
- **View**: Top-down bird's eye view showing the entire vehicle
- **Quality**: Clear, well-lit images showing distinct vehicle areas
- **Background**: Transparent or solid white background

## Zone Positioning

The clickable zones are positioned as percentages of the image:
- Zones will automatically scale with your images
- Zone positions are defined in `src/components/contracts/vehicle-inspection/types.ts`

## Alternative

If you don't have images, the system will automatically fall back to a simplified SVG diagram.

## Finding Images

You can get suitable vehicle images from:
- Car manufacturer websites (media kits)
- Stock photo sites (Shutterstock, Getty Images, etc.)
- Open source image repositories
- Hire a graphic designer to create custom top-view illustrations
