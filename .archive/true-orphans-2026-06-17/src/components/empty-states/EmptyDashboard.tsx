import React from 'react';
import { BarChart3 } from 'lucide-react';
import { EmptyState } from './EmptyState';

interface EmptyDashboardProps {
  /** Primary action handler */
  onGetStarted?: () => void;
  /** Secondary action handler */
  onLearnMore?: () => void;
  /** Custom title */
  title?: string;
  /** Custom description */
  description?: string;
}

export const EmptyDashboard: React.FC<EmptyDashboardProps> = ({
  onGetStarted,
  onLearnMore,
  title = 'لا توجد بيانات لعرضها',
  description = 'ابدأ بإضافة البيانات لرؤية الإحصائيات والتقارير',
}) => {
  // SVG Illustration
  const illustration = (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      {/* Chart background */}
      <rect
        x="30"
        y="30"
        width="140"
        height="100"
        rx="4"
        fill="hsl(var(--muted))"
        opacity="0.1"
      />

      {/* Empty chart bars */}
      <g opacity="0.2">
        <rect x="50" y="90" width="15" height="30" rx="2" fill="currentColor" />
        <rect x="75" y="70" width="15" height="50" rx="2" fill="currentColor" />
        <rect x="100" y="85" width="15" height="35" rx="2" fill="currentColor" />
        <rect x="125" y="60" width="15" height="60" rx="2" fill="currentColor" />
      </g>

      {/* Axis lines */}
      <line
        x1="40"
        y1="130"
        x2="160"
        y2="130"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.2"
      />
      <line
        x1="40"
        y1="50"
        x2="40"
        y2="130"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.2"
      />

      {/* Empty state icon */}
      <g transform="translate(85, 150)">
        <circle cx="15" cy="15" r="20" fill="hsl(var(--muted))" opacity="0.3" />
        <path
          d="M 10 20 L 10 10 L 20 10 L 20 15 L 15 15 L 15 20 Z"
          fill="currentColor"
          opacity="0.4"
        />
      </g>

      {/* Decorative dots */}
      <circle cx="50" cy="45" r="3" fill="hsl(var(--muted-foreground))" opacity="0.3" />
      <circle cx="90" cy="45" r="3" fill="hsl(var(--muted-foreground))" opacity="0.3" />
      <circle cx="130" cy="45" r="3" fill="hsl(var(--muted-foreground))" opacity="0.3" />
    </svg>
  );

  return (
    <EmptyState
      illustration={illustration}
      title={title}
      description={description}
      actionText={onGetStarted ? 'البدء الآن' : undefined}
      onAction={onGetStarted}
      secondaryActionText={onLearnMore ? 'معرفة المزيد' : undefined}
      onSecondaryAction={onLearnMore}
      iconColor="text-blue-500"
    />
  );
};

export default EmptyDashboard;
