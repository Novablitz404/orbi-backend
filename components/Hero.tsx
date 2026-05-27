'use client';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import Image from 'next/image';
import { ArrowRight, Fingerprint, Shield, Zap } from 'lucide-react';

const floatingPills = [
  { icon: Shield,      label: 'Passkey Secured',    delay: 0.8,  x: '-80%', y: '10%'  },
  { icon: Zap,         label: 'Instant Transfers',  delay: 1.0,  x: '75%',  y: '20%'  },
  { icon: Fingerprint, label: 'Biometric Auth',     delay: 1.2,  x: '-70%', y: '65%'  },
];

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const phoneY   = useTransform(scrollYProgress, [0, 1], ['0%', '12%']);
  const contentY = useTransform(scrollYProgress, [0, 1], ['0%', '6%']);
  const opacity  = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <section
      ref={ref}
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-16"
    >
      {/* Layered background */}
      <div className="absolute inset-0 bg-[#0D0D0D]" />

      {/* Dot grid */}
      <div
        className="absolute inset-0 opacity-100"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.055) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Hero glow */}
      <div className="absolute inset-x-0 bottom-0 h-[70%] bg-[radial-gradient(ellipse_80%_60%_at_50%_100%,rgba(62,207,142,0.10)_0%,transparent_70%)]" />

      {/* Top vignette */}
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#0D0D0D] to-transparent pointer-events-none" />

      <motion.div style={{ y: contentY, opacity }} className="relative z-10 w-full">
        <div className="max-w-6xl mx-auto px-6 flex flex-col items-center text-center">

          {/* Live badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-10 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orbi-green opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orbi-green" />
            </span>
            <span className="text-xs font-medium text-ink-secondary tracking-wide">
              Live on Stellar Testnet
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="font-display text-[clamp(52px,9vw,100px)] font-semibold leading-[1.02] tracking-[-0.03em] text-ink mb-6"
          >
            The smartest<br />
            <span className="text-orbi-green">wallet on</span>{' '}
            <span
              className="inline-block relative"
              style={{
                backgroundImage: 'linear-gradient(135deg, #EDEDED 0%, rgba(237,237,237,0.7) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Stellar.
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="text-[clamp(16px,2vw,20px)] text-ink-secondary max-w-2xl leading-relaxed mb-10"
          >
            Passkey-secured. Self-custodial. Built on Soroban smart contracts.
            Send USDC anywhere in seconds — no seed phrases, no complexity.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center gap-4 mb-24"
          >
            <a
              href="#download"
              className="group relative flex items-center gap-2.5 px-8 py-4 rounded-full btn-shimmer text-black font-semibold text-[15px] shadow-[0_0_30px_rgba(62,207,142,0.30)] hover:shadow-[0_0_45px_rgba(62,207,142,0.45)] transition-shadow duration-300"
            >
              Download for Android
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
            </a>
            <a
              href="#features"
              className="flex items-center gap-2 px-8 py-4 rounded-full border border-white/[0.10] text-ink-secondary font-semibold text-[15px] hover:border-white/[0.20] hover:text-ink transition-all duration-200"
            >
              Explore features
            </a>
          </motion.div>

          {/* Phone mockup */}
          <motion.div
            style={{ y: phoneY }}
            className="relative flex items-center justify-center"
          >
            {/* Floating pills */}
            {floatingPills.map(({ icon: Icon, label, delay, x, y }) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay }}
                className="absolute hidden lg:flex items-center gap-2 px-3.5 py-2 rounded-full glass border border-white/[0.10] whitespace-nowrap z-20 animate-float"
                style={{ left: x, top: y }}
              >
                <div className="w-6 h-6 rounded-full bg-orbi-green/15 flex items-center justify-center">
                  <Icon size={12} className="text-orbi-green" />
                </div>
                <span className="text-xs font-medium text-ink-secondary">{label}</span>
              </motion.div>
            ))}

            {/* Outer glow ring */}
            <div className="absolute w-[320px] h-[640px] rounded-[52px] bg-orbi-green/[0.06] blur-3xl" />

            {/* Phone frame */}
            <motion.div
              initial={{ opacity: 0, y: 60, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-[280px] h-[580px] rounded-[44px] overflow-hidden phone-glow border border-white/[0.10] animate-float"
              style={{ background: '#141414' }}
            >
              {/* Notch */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-6 rounded-full bg-[#0D0D0D] z-10 flex items-center justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#1a1a1a] border border-white/[0.06]" />
                <div className="w-10 h-1.5 rounded-full bg-[#1a1a1a] border border-white/[0.06]" />
              </div>

              {/* Screenshot */}
              <Image
                src="/screen-home.jpg"
                alt="Orbi Wallet Home Screen"
                fill
                className="object-cover object-top"
                priority
              />

              {/* Screen overlay shimmer */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30 pointer-events-none" />
            </motion.div>

            {/* Bottom platform reflection */}
            <div className="absolute -bottom-10 w-[200px] h-[40px] bg-orbi-green/[0.08] blur-2xl rounded-full" />
          </motion.div>
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.6 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="text-xs text-ink-muted tracking-widest uppercase">Scroll</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          className="w-px h-8 bg-gradient-to-b from-ink-muted to-transparent"
        />
      </motion.div>
    </section>
  );
}
