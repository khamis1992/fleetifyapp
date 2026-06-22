import React from 'react';
import { motion, MotionProps } from 'framer-motion';
import { logger } from './logger';

// مكونات متوافقة مع Framer Motion لتجنب مشاكل React 19
interface CompatibleMotionProps extends MotionProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}

export const CompatibleMotionDiv: React.FC<CompatibleMotionProps> = ({ 
  children, 
  fallback = null, 
  ...props 
}) => {
  try {
    return <motion.div {...props}>{children}</motion.div>;
  } catch (error) {
    logger.warn('Framer Motion compatibility issue:', error);
    // العودة إلى div عادي في حالة وجود مشكلة
    return <div className={props.className}>{fallback || children}</div>;
  }
};

export const CompatibleMotionSection: React.FC<CompatibleMotionProps> = ({ 
  children, 
  fallback = null, 
  ...props 
}) => {
  try {
    return <motion.section {...props}>{children}</motion.section>;
  } catch (error) {
    logger.warn('Framer Motion compatibility issue:', error);
    return <section className={props.className}>{fallback || children}</section>;
  }
};

export const CompatibleMotionSpan: React.FC<CompatibleMotionProps> = ({ 
  children, 
  fallback = null, 
  ...props 
}) => {
  try {
    return <motion.span {...props}>{children}</motion.span>;
  } catch (error) {
    logger.warn('Framer Motion compatibility issue:', error);
    return <span className={props.className}>{fallback || children}</span>;
  }
};

// انيميشن presets آمنة
export const safeAnimations = {
  fadeIn: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.3, ease: 'easeOut' }
  },
  
  slideIn: {
    initial: { x: -20, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: 20, opacity: 0 },
    transition: { duration: 0.3, ease: 'easeOut' }
  },
  
  scale: {
    initial: { scale: 0.95, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.95, opacity: 0 },
    transition: { duration: 0.2, ease: 'easeOut' }
  }
};