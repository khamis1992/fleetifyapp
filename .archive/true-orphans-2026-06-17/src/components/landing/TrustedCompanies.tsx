import { motion } from 'framer-motion';

const companies = [
  { name: 'شركة التقنية', logo: '🏢' },
  { name: 'مختبر الابتكار', logo: '🔬' },
  { name: 'أنظمة تدفق البيانات', logo: '📊' },
  { name: 'حلول التقنية السحابية', logo: '☁️' },
  { name: 'صناعات الجيل القادم', logo: '🚀' },
  { name: 'الديناميكيات الرقمية', logo: '💻' },
];

export function TrustedCompanies() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
      },
    },
  };

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={containerVariants}
          className="text-center"
        >
          <motion.h3 
            variants={itemVariants}
            className="arabic-heading-sm text-muted-foreground mb-12 text-center text-container"
          >
            يثق بنا قادة الشركات العالمية
          </motion.h3>
          
          <motion.div 
            variants={containerVariants}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 items-center"
          >
            {companies.map((company, index) => (
              <motion.div
                key={company.name}
                variants={itemVariants}
                whileHover={{ scale: 1.05 }}
                className="flex flex-col items-center space-y-2 p-4 rounded-lg bg-card/50 backdrop-blur-sm border border-border/30 hover:border-primary/30 transition-all duration-300"
              >
                <span className="text-3xl">{company.logo}</span>
                <span className="arabic-body-sm font-medium text-muted-foreground">
                  {company.name}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}