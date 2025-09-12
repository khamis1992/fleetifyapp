import { motion } from 'framer-motion';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AnnouncementBar() {
  return (
    <motion.div
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="bg-gradient-primary py-3 relative overflow-hidden"
    >
      {/* Background Animation */}
      <motion.div
        animate={{ 
          backgroundPosition: ['0% 0%', '100% 100%'],
        }}
        transition={{ 
          duration: 8,
          repeat: Infinity,
          repeatType: 'reverse'
        }}
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%)',
          backgroundSize: '200% 200%'
        }}
      />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex items-center justify-center text-center">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            className="inline-flex mr-3"
          >
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </motion.div>
          
          <span className="text-primary-foreground font-medium arabic-body-sm">
            🎉 عرض خاص: تجربة مجانية لمدة 14 يوم - بدون الحاجة لبطاقة ائتمان
          </span>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="mr-4 text-primary-foreground hover:bg-white/20 arabic-body-sm"
          >
            ابدأ الآن
            <ArrowLeft className="mr-2 h-3 w-3" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}