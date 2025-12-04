import React from 'react';
import { motion } from 'framer-motion';

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
  animated?: boolean;
}

export const Sparkline: React.FC<SparklineProps> = ({ 
  data, 
  color = 'bg-coral-500',
  height = 32,
  animated = true
}) => {
  if (!data || data.length === 0) return null;
  
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  return (
    <div className="flex items-end gap-[2px] h-full" style={{ height }}>
      {data.map((value, i) => {
        const heightPercent = ((value - min) / range) * 100;
        const barHeight = Math.max(heightPercent, 15);
        
        if (animated) {
          return (
            <motion.div
              key={i}
              className={`flex-1 rounded-sm ${color} opacity-80 hover:opacity-100 transition-opacity cursor-pointer`}
              initial={{ height: 0 }}
              animate={{ height: `${barHeight}%` }}
              transition={{ 
                duration: 0.5, 
                delay: i * 0.05,
                ease: "easeOut"
              }}
              whileHover={{ scale: 1.1 }}
              title={`${value}`}
            />
          );
        }
        
        return (
          <div
            key={i}
            className={`flex-1 rounded-sm ${color} opacity-80 hover:opacity-100 transition-all cursor-pointer hover:scale-110`}
            style={{ height: `${barHeight}%` }}
            title={`${value}`}
          />
        );
      })}
    </div>
  );
};

export default Sparkline;



