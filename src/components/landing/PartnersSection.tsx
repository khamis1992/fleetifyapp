import { motion } from 'framer-motion';

const partners = [
  { name: 'شركة الرياض للتطوير', logo: 'R' },
  { name: 'مجموعة بن لادن', logo: 'BL' },
  { name: 'شركة سابك', logo: 'S' },
  { name: 'أرامكو السعودية', logo: 'A' },
  { name: 'بنك الراجحي', logo: 'BR' },
  { name: 'شركة الاتصالات', logo: 'STC' },
  { name: 'مجموعة صافولا', logo: 'SF' },
  { name: 'شركة المراعي', logo: 'M' }
];

export function PartnersSection() {
  const duplicatedPartners = [...partners, ...partners]; // Duplicate for infinite scroll

  return (
    <section className="py-16 bg-background border-y border-border/50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h2 className="arabic-heading-lg mb-4 text-center">
            يثق بنا عملاء رائدون
          </h2>
          <p className="arabic-body text-muted-foreground text-center">
            شركات رائدة في المملكة العربية السعودية والشرق الأوسط تستخدم نظامنا
          </p>
        </motion.div>

        <div className="relative overflow-hidden">
          <motion.div
            animate={{
              x: [0, -1920]
            }}
            transition={{
              x: {
                repeat: Infinity,
                repeatType: "loop",
                duration: 40,
                ease: "linear",
              },
            }}
            className="flex space-x-8"
            style={{ width: 'calc(240px * 16)' }}
          >
            {duplicatedPartners.map((partner, index) => (
              <motion.div
                key={`${partner.name}-${index}`}
                whileHover={{ scale: 1.05 }}
                className="flex-shrink-0 w-56 h-24 bg-card border border-border/50 rounded-lg flex items-center justify-center group hover:shadow-md transition-all duration-300"
              >
                <div className="text-center">
                  <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                    <span className="text-primary-foreground font-bold text-lg">
                      {partner.logo}
                    </span>
                  </div>
                  <span className="arabic-body-sm font-medium text-container group-hover:text-primary transition-colors">
                    {partner.name}
                  </span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="text-center mt-8"
        >
          <p className="arabic-body-sm text-muted-foreground">
            وآلاف الشركات الأخرى التي تعتمد على نظامنا في إدارة أعمالها
          </p>
        </motion.div>
      </div>
    </section>
  );
}