import React from 'react';
import { motion } from 'framer-motion';

export function AnimatedDashboardBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Animated gradient background */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(45deg, hsl(var(--background)), hsl(var(--background) / 0.8), hsl(var(--muted) / 0.2))',
          willChange: 'background',
        }}
        animate={{
          backgroundImage: [
            'linear-gradient(45deg, hsl(var(--background)), hsl(var(--background) / 0.8), hsl(var(--muted) / 0.2))',
            'linear-gradient(135deg, hsl(var(--background)), hsl(var(--primary) / 0.05), hsl(var(--accent) / 0.1))',
            'linear-gradient(225deg, hsl(var(--background)), hsl(var(--background) / 0.8), hsl(var(--muted) / 0.2))',
          ],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Floating particles */}
      <div className="absolute inset-0">
        {Array.from({ length: 15 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-primary/10"
            style={{
              width: Math.random() * 40 + 20,
              height: Math.random() * 40 + 20,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              x: [0, 20, 0],
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 6 + Math.random() * 4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Gradient overlays */}
      <motion.div
        className="absolute top-0 left-0 w-96 h-96 bg-gradient-radial from-primary/20 to-primary/0 rounded-full blur-3xl"
        style={{ willChange: 'transform' }}
        animate={{
          x: [0, 100, 0],
          y: [0, 50, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      
      <motion.div
        className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gradient-radial from-accent/20 to-accent/0 rounded-full blur-3xl"
        style={{ willChange: 'transform' }}
        animate={{
          x: [0, -100, 0],
          y: [0, -50, 0],
          scale: [1, 1.3, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 5,
        }}
      />
    </div>
  );
}