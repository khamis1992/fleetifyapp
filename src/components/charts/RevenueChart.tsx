import React, { memo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface RevenueChartProps {
  data: Array<{
    month: string;
    revenue: number;
    contracts: number;
  }>;
}

const RevenueChart: React.FC<RevenueChartProps> = memo(({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip 
          labelStyle={{ direction: 'rtl' }}
          contentStyle={{ direction: 'rtl', textAlign: 'right' }}
        />
        <Line 
          type="monotone" 
          dataKey="revenue" 
          stroke="hsl(var(--primary))" 
          strokeWidth={2}
          dot={{ fill: 'hsl(var(--primary))' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
});

RevenueChart.displayName = 'RevenueChart';

export default RevenueChart;