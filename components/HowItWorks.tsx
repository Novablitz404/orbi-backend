'use client';
import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { KeyRound, Send, ShieldCheck } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: KeyRound,
    title: 'Create your wallet',
    description:
      'Scan your face or fingerprint. Orbi creates a Soroban smart wallet tied to your passkey — no seed phrase, no passwords.',
    detail: 'Takes about 30 seconds.',
  },
  {
    number: '02',
    icon: Send,
    title: 'Send or receive',
    description:
      'Enter an amount, paste an address or choose a contact, confirm with biometrics. Settled on Stellar in seconds.',
    detail: 'Near-zero fees. Global.',
  },
  {
    number: '03',
    icon: ShieldCheck,
    title: 'Sleep easy',
    description:
      'Assign guardians you trust. If your phone is stolen, freeze your wallet remotely and recover it on any device.',
    detail: 'Always in control.',
  },
];

export function HowItWorks() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="how-it-works" className="relative py-32 overflow-hidden">
      <div className="absolute inset-0 bg-[#0D0D0D]" />
      {/* Subtle separator gradient */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      <div className="relative max-w-6xl mx-auto px-6">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-orbi-green/25 bg-orbi-green/[0.06] mb-6">
            <div className="w-1 h-1 rounded-full bg-orbi-green" />
            <span className="text-xs font-medium text-orbi-green tracking-wide uppercase">
              How it works
            </span>
          </div>
          <h2 className="font-display text-[clamp(36px,5vw,56px)] font-semibold text-ink leading-tight tracking-tight mb-4">
            Simple by design.
          </h2>
          <p className="text-ink-secondary text-lg max-w-lg mx-auto">
            DeFi-grade security with a UX that feels like a fintech app.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Connecting line */}
          <div className="absolute hidden md:block top-[52px] left-[calc(16.666%+24px)] right-[calc(16.666%+24px)] h-px">
            <div className="absolute inset-0 bg-gradient-to-r from-orbi-green/30 via-orbi-green/15 to-orbi-green/30" />
          </div>

          {steps.map(({ number, icon: Icon, title, description, detail }, i) => (
            <motion.div
              key={number}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.65, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="group flex flex-col items-center text-center relative"
            >
              {/* Circle */}
              <div className="relative mb-8">
                {/* Outer ring */}
                <div className="absolute inset-0 rounded-full border border-orbi-green/[0.20] scale-[1.35] group-hover:scale-[1.5] transition-transform duration-500" />

                <div className="relative w-[72px] h-[72px] rounded-full bg-[#161616] border border-white/[0.10] flex items-center justify-center group-hover:border-orbi-green/30 transition-colors duration-300 shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
                  <Icon size={28} className="text-orbi-green" strokeWidth={1.5} />
                </div>

                {/* Number tag */}
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-orbi-green flex items-center justify-center">
                  <span className="text-[9px] font-bold text-black">{i + 1}</span>
                </div>
              </div>

              {/* Step number */}
              <div className="font-mono text-xs text-orbi-green/50 mb-2 tracking-widest">
                {number}
              </div>

              <h3 className="font-display text-xl font-semibold text-ink mb-3">{title}</h3>
              <p className="text-ink-secondary text-sm leading-relaxed mb-4 max-w-xs">
                {description}
              </p>

              {/* Detail pill */}
              <div className="px-3 py-1 rounded-full border border-white/[0.07] bg-white/[0.02] text-xs text-ink-muted">
                {detail}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
