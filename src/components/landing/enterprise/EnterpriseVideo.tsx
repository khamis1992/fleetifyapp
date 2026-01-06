import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { Car, FileText, BarChart3, Users, MapPin, Activity, Zap, TrendingUp } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';

export function EnterpriseVideo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start']
  });

  const rotateY = useTransform(scrollYProgress, [0, 1], [15, -15]);
  const rotateX = useTransform(scrollYProgress, [0, 1], [10, -10]);
  const scale = useSpring(useTransform(scrollYProgress, [0.2, 0.8], [0.95, 1.05]), {
    stiffness: 100,
    damping: 30
  });

  // Animated particles
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 3 + 2,
    delay: Math.random() * 2,
  }));

  const cityLocations = [
    { name: 'الدوحة', x: 50, y: 45, vehicles: 245 },
    { name: 'الوكرة', x: 65, y: 60, vehicles: 89 },
    { name: 'الخور', x: 70, y: 25, vehicles: 67 },
    { name: 'الريان', x: 35, y: 40, vehicles: 54 },
  ];

  const floatingData = [
    {
      icon: Car,
      label: 'مركبة نشطة',
      value: '524',
      subtext: 'مُدارة في الوقت الفعلي',
      color: 'from-teal-400 to-teal-500',
      position: { top: '10%', left: '5%' }
    },
    {
      icon: FileText,
      label: 'عقد نشط',
      value: '1,247',
      subtext: 'إجمالي العقود',
      color: 'from-teal-400 to-teal-500',
      position: { top: '10%', right: '5%' }
    },
    {
      icon: Users,
      label: 'شركة',
      value: '500+',
      subtext: 'عميل موثوق',
      color: 'from-teal-400 to-teal-500',
      position: { bottom: '15%', left: '5%' }
    },
    {
      icon: BarChart3,
      label: 'إيرادات',
      value: '2.4M',
      subtext: 'ريال قطري',
      color: 'from-teal-400 to-teal-500',
      position: { bottom: '15%', right: '5%' }
    },
  ];

  return (
    <section className="py-24 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden" dir="rtl">
      {/* Animated grid background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(20, 184, 166, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(20, 184, 166, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          animation: 'gridMove 20s linear infinite'
        }} />
      </div>

      {/* Floating particles */}
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-teal-400/30 blur-sm"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.3, 0.8, 0.3],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: 'easeInOut'
          }}
        />
      ))}

      {/* Glowing orbs */}
      <div className="absolute top-20 right-20 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '3s' }}></div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-teal-500/10 to-teal-500/5 backdrop-blur-md rounded-full border border-teal-500/30 text-teal-400 text-sm font-bold mb-8 shadow-lg shadow-teal-500/20"
          >
            <Activity className="w-5 h-5 animate-pulse" />
            <span>نظام تحكم متطور</span>
          </motion.div>

          <h2 className="text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            اكتشف قوة
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-teal-300">
              المنصة الذكية
            </span>
          </h2>

          <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            واجهة تحكم هolographic ثلاثية الأبعاد مع بيانات مباشرة وتحليلات فورية
          </p>
        </motion.div>

        {/* Main 3D Showcase */}
        <motion.div
          ref={containerRef}
          style={{
            rotateY,
            rotateX,
            scale,
          }}
          className="relative max-w-6xl mx-auto mb-16 perspective-2000"
        >
          {/* Holographic base */}
          <div className="relative h-[600px]">
            {/* 3D City Map - Isometric */}
            <motion.div
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px]"
              animate={{
                rotate: 360,
              }}
              transition={{
                duration: 60,
                repeat: Infinity,
                ease: 'linear'
              }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Stylized Qatar map */}
              <svg
                viewBox="0 0 200 200"
                className="w-full h-full"
                style={{
                  transform: 'rotateX(60deg) rotateZ(45deg)',
                  transformStyle: 'preserve-3d'
                }}
              >
                {/* Grid */}
                <defs>
                  <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(20, 184, 166, 0.2)" strokeWidth="0.5"/>
                  </pattern>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                  <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#14B8A6" stopOpacity="0.8"/>
                    <stop offset="100%" stopColor="#0D9488" stopOpacity="0.3"/>
                  </linearGradient>
                </defs>

                {/* Background grid */}
                <rect width="200" height="200" fill="url(#grid)" />

                {/* Connection lines between cities */}
                {cityLocations.map((city, i) => {
                  if (i === 0) return null;
                  const prevCity = cityLocations[0];
                  return (
                    <motion.line
                      key={`line-${i}`}
                      x1={prevCity.x * 2}
                      y1={prevCity.y * 2}
                      x2={city.x * 2}
                      y2={city.y * 2}
                      stroke="url(#lineGradient)"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      initial={{ pathLength: 0, opacity: 0 }}
                      whileInView={{ pathLength: 1, opacity: 1 }}
                      transition={{ delay: i * 0.2, duration: 1.5 }}
                      filter="url(#glow)"
                    />
                  );
                })}

                {/* Animated route lines */}
                {cityLocations.slice(1).map((city, i) => (
                  <motion.circle
                    key={`route-${i}`}
                    r="3"
                    fill="#14B8A6"
                    filter="url(#glow)"
                    initial={{ opacity: 0 }}
                    animate={{
                      opacity: [0, 1, 0],
                      cx: [cityLocations[0].x * 2, city.x * 2],
                      cy: [cityLocations[0].y * 2, city.y * 2],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      delay: i * 0.5,
                      ease: 'easeInOut'
                    }}
                  />
                ))}

                {/* City markers */}
                {cityLocations.map((city, i) => (
                  <g key={`city-${i}`}>
                    {/* Outer ring */}
                    <motion.circle
                      cx={city.x * 2}
                      cy={city.y * 2}
                      r="15"
                      fill="none"
                      stroke="#14B8A6"
                      strokeWidth="2"
                      opacity="0.3"
                      animate={{ r: [15, 25, 15] }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                    />
                    {/* Inner circle */}
                    <circle
                      cx={city.x * 2}
                      cy={city.y * 2}
                      r="8"
                      fill="#14B8A6"
                      filter="url(#glow)"
                    />
                    {/* Vehicle count */}
                    <text
                      x={city.x * 2}
                      y={city.y * 2 + 30}
                      fill="#fff"
                      fontSize="10"
                      textAnchor="middle"
                      className="font-bold"
                    >
                      {city.vehicles}
                    </text>
                  </g>
                ))}
              </svg>
            </motion.div>

            {/* Floating data cards */}
            {floatingData.map((data, index) => (
              <motion.div
                key={index}
                className="absolute"
                style={data.position}
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50, y: 30 }}
                whileInView={{ opacity: 1, x: 0, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1, duration: 0.6 }}
                onHoverStart={() => setHoveredCard(index)}
                onHoverEnd={() => setHoveredCard(null)}
              >
                <motion.div
                  className="relative backdrop-blur-xl bg-slate-900/60 rounded-2xl p-6 border border-teal-500/30 shadow-2xl overflow-hidden"
                  whileHover={{
                    scale: 1.05,
                    borderColor: 'rgba(20, 184, 166, 0.6)',
                    boxShadow: '0 0 30px rgba(20, 184, 166, 0.3)'
                  }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Holographic shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-transparent" />

                  {/* Corner accents */}
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-teal-500/50 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-teal-500/50 rounded-bl-lg" />

                  {/* Icon */}
                  <div className={`relative w-14 h-14 rounded-xl bg-gradient-to-br ${data.color} flex items-center justify-center mb-4 shadow-lg`}>
                    <data.icon className="w-7 h-7 text-white" />
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent" />
                  </div>

                  {/* Content */}
                  <p className="text-slate-400 text-sm mb-1">{data.label}</p>
                  <motion.p
                    className="text-4xl font-bold text-white mb-1"
                    animate={hoveredCard === index ? { scale: [1, 1.1, 1] } : {}}
                  >
                    {data.value}
                  </motion.p>
                  <p className="text-teal-400 text-xs">{data.subtext}</p>

                  {/* Animated underline */}
                  {hoveredCard === index && (
                    <motion.div
                      className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-teal-400 to-teal-500"
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 0.3 }}
                    />
                  )}
                </motion.div>
              </motion.div>
            ))}

            {/* Center holographic ring */}
            <motion.div
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 pointer-events-none"
              animate={{ rotate: 360 }}
              transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
            >
              <div className="absolute inset-0 border-2 border-dashed border-teal-500/30 rounded-full" />
              <div className="absolute inset-4 border border-teal-500/20 rounded-full" />
              <div className="absolute inset-8 border border-dashed border-teal-500/10 rounded-full" />
            </motion.div>

            {/* Pulsing center */}
            <motion.div
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 opacity-80 blur-xl"
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            <motion.div
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-gradient-to-br from-teal-400 to-teal-500 flex items-center justify-center shadow-lg shadow-teal-500/50"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Activity className="w-8 h-8 text-white" />
            </motion.div>
          </div>
        </motion.div>

        {/* Feature cards grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto"
        >
          {[
            { icon: MapPin, title: 'تتبع فوري', desc: 'موقع كل مركبة مباشر', stat: '99.9%' },
            { icon: Zap, title: 'سرعة فائقة', desc: 'أداء متفوق', stat: '< 100ms' },
            { icon: TrendingUp, title: 'تحليلات ذكية', desc: 'تقارير مفصلة', stat: '24/7' },
          ].map((feature, index) => (
            <motion.div
              key={index}
              className="group relative backdrop-blur-xl bg-slate-900/40 rounded-2xl p-6 border border-slate-700/50 hover:border-teal-500/50 transition-all overflow-hidden"
              whileHover={{
                y: -8,
                borderColor: 'rgba(20, 184, 166, 0.5)',
                boxShadow: '0 20px 40px rgba(20, 184, 166, 0.2)'
              }}
            >
              {/* Background gradient on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              {/* Icon */}
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500/20 to-teal-500/10 flex items-center justify-center mb-4 border border-teal-500/30 group-hover:scale-110 transition-transform">
                <feature.icon className="w-8 h-8 text-teal-400" />
              </div>

              {/* Stat badge */}
              <motion.div
                className="absolute top-4 left-4 px-3 py-1 bg-teal-500/20 rounded-full text-teal-400 text-xs font-bold"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity, delay: index * 0.2 }}
              >
                {feature.stat}
              </motion.div>

              {/* Content */}
              <h3 className="relative text-xl font-bold text-white mb-2">{feature.title}</h3>
              <p className="relative text-slate-400 text-sm">{feature.desc}</p>

              {/* Corner decoration */}
              <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-teal-500/30 rounded-br-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.div>
          ))}
        </motion.div>
      </div>

      <style>{`
        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }
      `}</style>
    </section>
  );
}