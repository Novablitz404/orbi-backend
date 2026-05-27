'use client';
import { useRef, useState } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

const screens = [
  { src: '/screen-home.jpg',  label: 'Home',         desc: 'Balance, quick actions, and recent transactions at a glance.' },
  { src: '/screen-1.jpg',     label: 'Send',         desc: 'Send USDC to any Stellar address or saved contact in seconds.' },
  { src: '/screen-2.jpg',     label: 'Receive',      desc: 'Share your QR code or address. Get paid instantly.' },
  { src: '/screen-3.jpg',     label: 'Transactions', desc: 'Full history with amounts, timestamps, and status.' },
  { src: '/screen-4.jpg',     label: 'Security',     desc: 'Manage guardians, freeze settings, and biometric access.' },
];

export function Screenshots() {
  const [active, setActive] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section className="relative py-32 overflow-hidden">
      <div className="absolute inset-0 bg-[#0D0D0D]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-[50%] bg-[radial-gradient(ellipse_60%_60%_at_50%_100%,rgba(62,207,142,0.06)_0%,transparent_70%)]" />

      <div className="relative max-w-6xl mx-auto px-6">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-orbi-green/25 bg-orbi-green/[0.06] mb-6">
            <div className="w-1 h-1 rounded-full bg-orbi-green" />
            <span className="text-xs font-medium text-orbi-green tracking-wide uppercase">
              App preview
            </span>
          </div>
          <h2 className="font-display text-[clamp(36px,5vw,56px)] font-semibold text-ink leading-tight tracking-tight mb-4">
            Designed for clarity.
          </h2>
          <p className="text-ink-secondary text-lg max-w-md mx-auto">
            Every screen built to get out of your way and let you focus on what matters — your money.
          </p>
        </motion.div>

        <div className="flex flex-col lg:flex-row items-center gap-12">
          {/* Tab selectors */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="lg:w-64 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible w-full"
          >
            {screens.map(({ label, desc }, i) => (
              <button
                key={label}
                onClick={() => setActive(i)}
                className={`flex-shrink-0 lg:w-full text-left px-4 py-3.5 rounded-xl border transition-all duration-200 ${
                  active === i
                    ? 'bg-orbi-green/[0.08] border-orbi-green/30 text-ink'
                    : 'border-white/[0.06] text-ink-secondary hover:border-white/[0.12] hover:text-ink bg-transparent'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {active === i && <div className="w-1.5 h-1.5 rounded-full bg-orbi-green flex-shrink-0" />}
                  <span className="text-sm font-semibold">{label}</span>
                </div>
                <p className="hidden lg:block text-xs text-ink-muted leading-relaxed">{desc}</p>
              </button>
            ))}
          </motion.div>

          {/* Phone frame */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="flex-1 flex items-center justify-center"
          >
            <div className="relative">
              {/* Glow */}
              <div className="absolute inset-0 -m-8 bg-orbi-green/[0.05] rounded-full blur-3xl" />

              {/* Phone */}
              <div className="relative w-[260px] h-[540px] rounded-[40px] overflow-hidden phone-glow border border-white/[0.10]"
                style={{ background: '#141414' }}>
                {/* Notch */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-5 rounded-full bg-[#0D0D0D] z-10" />

                <AnimatePresence mode="wait">
                  <motion.div
                    key={active}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="absolute inset-0"
                  >
                    <Image
                      src={screens[active].src}
                      alt={screens[active].label}
                      fill
                      className="object-cover object-top"
                    />
                  </motion.div>
                </AnimatePresence>

                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20 pointer-events-none" />
              </div>

              {/* Dot indicators */}
              <div className="flex items-center justify-center gap-1.5 mt-6">
                {screens.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActive(i)}
                    className={`rounded-full transition-all duration-300 ${
                      active === i ? 'w-5 h-1.5 bg-orbi-green' : 'w-1.5 h-1.5 bg-white/20'
                    }`}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
