import React from 'react';
import { motion } from 'framer-motion';

const ModernBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Primary gradient background */}
      <motion.div 
        className="absolute inset-0 bg-gradient-hero"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
      />
      
      {/* Glass morphism overlay */}
      <motion.div 
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.8, delay: 0.3 }}
      >
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `
              linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)
            `,
            backgroundSize: '32px 32px'
          }}
        />
        
        {/* Executive glow effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/6 rounded-full blur-3xl" />
        <div className="absolute top-3/4 left-3/4 w-64 h-64 bg-primary/4 rounded-full blur-2xl" />
        
        {/* Floating geometric elements */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              width: `${8 + i * 2}px`,
              height: `${8 + i * 2}px`,
              left: `${15 + i * 12}%`,
              top: `${20 + i * 8}%`,
            }}
            animate={{
              y: [0, -15, 0],
              rotate: [0, 180, 360],
              opacity: [0.1, 0.3, 0.1],
            }}
            transition={{
              duration: 8 + i * 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.8,
            }}
          >
            <div className="w-full h-full bg-primary/10 rounded-full" />
          </motion.div>
        ))}
        
        {/* Executive accent lines */}
        <motion.div
          className="absolute top-0 left-1/3 w-px h-full bg-gradient-to-b from-transparent via-primary/20 to-transparent"
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 2, delay: 1 }}
        />
        <motion.div
          className="absolute top-0 right-1/3 w-px h-full bg-gradient-to-b from-transparent via-accent/15 to-transparent"
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 2, delay: 1.2 }}
        />
        
        {/* Subtle mesh gradient overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            background: `
              radial-gradient(circle at 25% 25%, hsl(var(--primary)) 0%, transparent 50%),
              radial-gradient(circle at 75% 75%, hsl(var(--accent)) 0%, transparent 50%),
              radial-gradient(circle at 75% 25%, hsl(var(--primary)) 0%, transparent 50%),
              radial-gradient(circle at 25% 75%, hsl(var(--accent)) 0%, transparent 50%)
            `
          }}
        />
      </motion.div>
    </div>
  );
};

export default ModernBackground;