'use client';
import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { ShieldCheck, Key, Lock, Users, AlertTriangle } from 'lucide-react';

const pillars = [
  {
    icon: Key,
    title: 'Passkey, not password',
    description:
      'Your wallet key is a WebAuthn passkey generated and stored in your device\'s secure enclave. It never touches Orbi\'s servers.',
  },
  {
    icon: Lock,
    title: 'On-chain smart wallet',
    description:
      'Every wallet is a Soroban smart contract. Transaction rules are code — transparent, auditable, and trustless.',
  },
  {
    icon: Users,
    title: 'Social recovery',
    description:
      'Assign up to N guardians. Losing your phone doesn\'t mean losing your funds — guardians can restore access.',
  },
  {
    icon: AlertTriangle,
    title: 'Remote freeze',
    description:
      'If your device is stolen, freeze your wallet from another device instantly. Your guardian can also trigger a freeze.',
  },
];

export function Security() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="security" className="relative py-32 overflow-hidden">
      {/* Dark elevated background */}
      <div className="absolute inset-0 bg-[#0D0D0D]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      {/* Background glow */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orbi-green/[0.04] rounded-full blur-[120px] pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left: Text */}
          <motion.div
            ref={ref}
            initial={{ opacity: 0, x: -40 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-orbi-green/25 bg-orbi-green/[0.06] mb-8">
              <div className="w-1 h-1 rounded-full bg-orbi-green" />
              <span className="text-xs font-medium text-orbi-green tracking-wide uppercase">
                Security
              </span>
            </div>

            <h2 className="font-display text-[clamp(36px,4vw,52px)] font-semibold text-ink leading-tight tracking-tight mb-6">
              Bank-grade security.
              <br />
              <span className="text-ink-secondary">Not bank-grade</span>
              <br />
              complexity.
            </h2>

            <p className="text-ink-secondary text-lg leading-relaxed mb-10 max-w-md">
              Orbi uses the same passkey standard as Apple Pay and Google Pay,
              combined with Soroban smart contracts to give you unmatched
              security without any of the traditional crypto complexity.
            </p>

            {/* Pillars */}
            <div className="flex flex-col gap-5">
              {pillars.map(({ icon: Icon, title, description }, i) => (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
                  className="flex items-start gap-4"
                >
                  <div className="mt-0.5 w-9 h-9 rounded-xl bg-orbi-green/[0.08] border border-orbi-green/[0.18] flex items-center justify-center flex-shrink-0">
                    <Icon size={16} className="text-orbi-green" strokeWidth={1.5} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-ink mb-0.5">{title}</div>
                    <div className="text-sm text-ink-secondary leading-relaxed">{description}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right: Visual */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex items-center justify-center"
          >
            {/* Outer glow */}
            <div className="absolute w-72 h-72 bg-orbi-green/[0.07] rounded-full blur-3xl" />

            {/* Central shield */}
            <div className="relative">
              {/* Orbit rings */}
              {[1, 2, 3].map(i => (
                <div
                  key={i}
                  className="absolute rounded-full border border-white/[0.05]"
                  style={{
                    inset: -(i * 48),
                    borderColor: i === 1 ? 'rgba(62,207,142,0.12)' : undefined,
                  }}
                />
              ))}

              {/* Shield */}
              <div className="relative w-32 h-32 rounded-[32px] bg-[#161616] border border-orbi-green/25 flex items-center justify-center shadow-[0_0_60px_rgba(62,207,142,0.15)]">
                <ShieldCheck size={56} className="text-orbi-green" strokeWidth={1} />
              </div>

              {/* Orbiting badges */}
              {[
                { label: 'Passkey', angle: -60,  delay: 0 },
                { label: 'On-chain', angle: 60,  delay: 0.2 },
                { label: 'Freeze',  angle: 180, delay: 0.4 },
              ].map(({ label, angle, delay }) => {
                const rad = (angle * Math.PI) / 180;
                const r = 120;
                const x = Math.cos(rad) * r;
                const y = Math.sin(rad) * r;
                return (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={inView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ duration: 0.5, delay: 0.5 + delay }}
                    className="absolute flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/[0.10] glass whitespace-nowrap"
                    style={{ left: '50%', top: '50%', transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-orbi-green" />
                    <span className="text-xs font-medium text-ink-secondary">{label}</span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
