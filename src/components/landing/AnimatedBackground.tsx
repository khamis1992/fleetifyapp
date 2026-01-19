import React from 'react';
import { motion } from 'framer-motion';

export function AnimatedBackground() {
  return (
    <motion.div 
      className="fixed inset-0 -z-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 2 }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
      
      {/* Animated geometric shapes */}
      <div className="absolute inset-0">
        {/* Large floating shapes */}
        {Array.from({ length: 5 }).map((_, i) => (
          <motion.div
            key={`large-${i}`}
            className="absolute rounded-full bg-primary/20"
            style={{
              width: Math.random() * 200 + 100,
              height: Math.random() * 200 + 100,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -50, 0],
              x: [0, 30, 0],
              scale: [1, 1.2, 1],
              opacity: [0.2, 0.6, 0.2],
            }}
            transition={{
              duration: 8 + Math.random() * 4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 3,
            }}
          />
        ))}
        
        {/* Small floating dots */}
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={`small-${i}`}
            className="absolute w-2 h-2 bg-accent/40 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 2,
            }}
          />
        ))}
        
        {/* Subtle grid lines */}
        <div className="absolute inset-0 opacity-20">
          <div 
            className="w-full h-full"
            style={{
              backgroundImage: `
                linear-gradient(rgba(var(--primary), 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(var(--primary), 0.1) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px'
            }}
          />
        </div>
      </div>
    </motion.div>
  );
}