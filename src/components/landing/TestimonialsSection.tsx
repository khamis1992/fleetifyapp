import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';
import { InteractiveCard } from './InteractiveCard';

const testimonials = [
  {
    name: "Ahmed Al-Rashid",
    company: "Kuwait Transport Co.",
    role: "Fleet Operations Director",
    content: "Fleetify transformed our operations completely. We've seen a 40% reduction in maintenance costs and 25% improvement in fuel efficiency. The real-time tracking has been a game-changer.",
    rating: 5,
    image: "👨‍💼",
    metrics: { savings: "€150K/year", efficiency: "+40%" }
  },
  {
    name: "Sarah Johnson",
    company: "Global Logistics Ltd",
    role: "CEO",
    content: "The comprehensive dashboard gives us insights we never had before. From HR management to financial tracking, everything is seamlessly integrated. Our team productivity increased by 35%.",
    rating: 5,
    image: "👩‍💼",
    metrics: { productivity: "+35%", integration: "100%" }
  },
  {
    name: "Mohamed Hassan",
    company: "Desert Eagle Freight",
    role: "Technology Manager",
    content: "Implementation was surprisingly smooth. The team was onboarded in just 2 days, and we started seeing benefits immediately. The automation features alone save us 20 hours per week.",
    rating: 5,
    image: "👨‍💻",
    metrics: { timeSaved: "20h/week", onboarding: "2 days" }
  }
];

export function TestimonialsSection() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 50, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.6,
      },
    },
  };

  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
            Trusted by Industry Leaders
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            See how companies like yours are transforming their operations with Fleetify
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {testimonials.map((testimonial, index) => (
            <motion.div key={testimonial.name} variants={itemVariants}>
              <InteractiveCard className="h-full">
                <div className="space-y-6">
                  {/* Quote Icon */}
                  <div className="flex justify-between items-start">
                    <Quote className="h-8 w-8 text-primary/30" />
                    <div className="flex space-x-1">
                      {Array.from({ length: testimonial.rating }, (_, i) => (
                        <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                      ))}
                    </div>
                  </div>

                  {/* Content */}
                  <blockquote className="text-lg leading-relaxed text-foreground">
                    "{testimonial.content}"
                  </blockquote>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                    {Object.entries(testimonial.metrics).map(([key, value]) => (
                      <div key={key} className="text-center">
                        <p className="text-lg font-bold text-primary">{value}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Author */}
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-2xl">
                      {testimonial.image}
                    </div>
                    <div>
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                      <p className="text-sm font-medium text-primary">{testimonial.company}</p>
                    </div>
                  </div>
                </div>
              </InteractiveCard>
            </motion.div>
          ))}
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8"
        >
          {[
            { label: 'Companies Trust Us', value: '500+' },
            { label: 'Vehicles Managed', value: '50K+' },
            { label: 'Average ROI', value: '300%' },
            { label: 'Customer Satisfaction', value: '99%' },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="text-center"
            >
              <p className="text-3xl md:text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                {stat.value}
              </p>
              <p className="text-sm text-muted-foreground mt-2">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}