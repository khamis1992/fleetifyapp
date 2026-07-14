import { render, screen } from '@testing-library/react';
import { CircleDollarSign, Users } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { StatCard } from '@/components/ui/StatCard';

describe('StatCard', () => {
  it('keeps coral and sky cards at the same dimensions', () => {
    const { container } = render(
      <div>
        <StatCard title="المستحق" value="100" icon={CircleDollarSign} variant="coral" />
        <StatCard title="العملاء" value="20" icon={Users} variant="sky" />
      </div>
    );

    const cards = Array.from(container.querySelectorAll('.min-h-\\[148px\\]'));
    expect(cards).toHaveLength(2);
    expect(cards.every((card) => card.classList.contains('rounded-lg'))).toBe(true);
    expect(screen.getByText('المستحق')).toBeInTheDocument();
    expect(screen.getByText('العملاء')).toBeInTheDocument();
  });
});
