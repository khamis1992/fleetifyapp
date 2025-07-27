import { motion } from 'framer-motion';

export function AnimatedDashboardBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Animated gradient background */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-background via-background/80 to-muted/20"
        animate={{
          background: [
            'linear-gradient(45deg, hsl(var(--background)), hsl(var(--background))/80%, hsl(var(--muted))/20%)',
            'linear-gradient(135deg, hsl(var(--background)), hsl(var(--primary))/5%, hsl(var(--accent))/10%)',
            'linear-gradient(225deg, hsl(var(--background)), hsl(var(--background))/80%, hsl(var(--muted))/20%)',
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
        {Array.from({ length: 6 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-primary/20 rounded-full"
            animate={{
              x: [0, 100, 0],
              y: [0, -100, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 10 + i * 2,
              repeat: Infinity,
              delay: i * 2,
              ease: 'easeInOut',
            }}
            style={{
              left: `${20 + i * 15}%`,
              top: `${30 + i * 10}%`,
            }}
          />
        ))}
      </div>

      {/* Geometric shapes for visual interest */}
      <div className="absolute inset-0 opacity-10">
        {Array.from({ length: 3 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-32 h-32 border border-primary/20 rounded-full"
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 360],
              opacity: [0.1, 0.3, 0.1],
            }}
            transition={{
              duration: 15 + i * 3,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 2,
            }}
            style={{
              left: `${30 + i * 25}%`,
              top: `${20 + i * 20}%`,
            }}
          />
        ))}
      </div>

      {/* Gradient overlays */}
      <motion.div
        className="absolute top-0 left-0 w-96 h-96 bg-gradient-radial from-primary/20 to-transparent rounded-full blur-3xl"
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
        className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gradient-radial from-accent/20 to-transparent rounded-full blur-3xl"
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