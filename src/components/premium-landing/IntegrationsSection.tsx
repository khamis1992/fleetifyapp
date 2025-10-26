import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

export function IntegrationsSection() {
  const integrations = [
    { name: 'Stripe', logo: '💳', color: 'from-blue-500 to-blue-600' },
    { name: 'PayPal', logo: '💰', color: 'from-blue-400 to-blue-500' },
    { name: 'QuickBooks', logo: '📊', color: 'from-green-500 to-green-600' },
    { name: 'Xero', logo: '📈', color: 'from-cyan-500 to-cyan-600' },
    { name: 'Slack', logo: '💬', color: 'from-purple-500 to-purple-600' },
    { name: 'WhatsApp', logo: '📱', color: 'from-green-400 to-green-500' },
    { name: 'Google Workspace', logo: '🔍', color: 'from-red-500 to-orange-500' },
    { name: 'Microsoft 365', logo: '📧', color: 'from-blue-600 to-blue-700' },
  ];

  return (
    <section className="py-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background to-accent/5" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-primary/10 border border-primary/20 rounded-full mb-4">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">تكاملات قوية</span>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              يتكامل مع أدواتك المفضلة
            </span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            اتصال سلس مع أكثر من 50+ تطبيق وخدمة عبر API قوي ومرن
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {integrations.map((integration, index) => (
            <motion.div
              key={integration.name}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className="group"
            >
              <div className={`relative bg-card/30 backdrop-blur-sm border border-border/30 rounded-xl p-6 hover:border-primary/30 transition-all duration-300 hover:shadow-elevated`}>
                <div className={`text-4xl mb-2`}>{integration.logo}</div>
                <p className="text-sm font-medium">{integration.name}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

