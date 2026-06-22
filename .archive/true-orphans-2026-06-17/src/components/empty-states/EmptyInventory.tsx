import React from 'react';
import { PackageX } from 'lucide-react';
import { EmptyState } from './EmptyState';

interface EmptyInventoryProps {
  /** Primary action handler */
  onAddProduct?: () => void;
  /** Import action handler */
  onImport?: () => void;
  /** Custom title */
  title?: string;
  /** Custom description */
  description?: string;
}

export const EmptyInventory: React.FC<EmptyInventoryProps> = ({
  onAddProduct,
  onImport,
  title = 'لا توجد منتجات في المخزون',
  description = 'ابدأ بإضافة منتجات إلى المخزون لتتبع الكميات والمبيعات',
}) => {
  // SVG Illustration
  const illustration = (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      {/* Empty warehouse boxes */}
      <g opacity="0.1">
        <rect x="40" y="80" width="40" height="40" fill="currentColor" />
        <rect x="90" y="80" width="40" height="40" fill="currentColor" />
        <rect x="140" y="80" width="40" height="40" fill="currentColor" />
        <rect x="65" y="40" width="40" height="40" fill="currentColor" />
        <rect x="115" y="40" width="40" height="40" fill="currentColor" />
      </g>

      {/* Empty box icon */}
      <g transform="translate(75, 90)">
        <rect
          x="0"
          y="20"
          width="50"
          height="40"
          rx="2"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          opacity="0.3"
        />
        <path
          d="M 0 20 L 25 5 L 50 20"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          opacity="0.3"
        />
        <line
          x1="25"
          y1="5"
          x2="25"
          y2="60"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="3 3"
          opacity="0.3"
        />
      </g>

      {/* Question marks */}
      <circle cx="60" cy="50" r="8" fill="hsl(var(--muted))" opacity="0.5" />
      <text
        x="60"
        y="55"
        textAnchor="middle"
        fontSize="12"
        fill="hsl(var(--muted-foreground))"
        fontWeight="bold"
      >
        ?
      </text>
      <circle cx="140" cy="50" r="8" fill="hsl(var(--muted))" opacity="0.5" />
      <text
        x="140"
        y="55"
        textAnchor="middle"
        fontSize="12"
        fill="hsl(var(--muted-foreground))"
        fontWeight="bold"
      >
        ?
      </text>
    </svg>
  );

  return (
    <EmptyState
      illustration={illustration}
      title={title}
      description={description}
      actionText={onAddProduct ? 'إضافة منتج جديد' : undefined}
      onAction={onAddProduct}
      secondaryActionText={onImport ? 'استيراد من ملف' : undefined}
      onSecondaryAction={onImport}
      iconColor="text-orange-500"
    />
  );
};

export default EmptyInventory;
