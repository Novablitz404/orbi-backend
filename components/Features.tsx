'use client';
import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  Fingerprint, Zap, Users, ShieldCheck, Globe, Lock,
} from 'lucide-react';

const features = [
  {
    icon: Fingerprint,
    title: 'Passkey Security',
    description:
      'Your wallet is secured by Face ID, fingerprint, or device PIN. The passkey never leaves your device — no seed phrase to write down or lose.',
    size: 'large',
    accent: '#3ECF8E',
    visual: 'passkey',
  },
  {
    icon: Zap,
    title: 'Instant Transfers',
    description:
      'Send USDC anywhere in the world in 3–5 seconds with near-zero fees on Stellar.',
    size: 'small',
    accent: '#6EDFA8',
    visual: 'speed',
  },
  {
    icon: Users,
    title: 'Guardian Recovery',
    description:
      'Assign trusted contacts as guardians. If you ever lose access, they can restore your wallet.',
    size: 'small',
    accent: '#3ECF8E',
    visual: null,
  },
  {
    icon: Globe,
    title: 'Built on Stellar',
    description:
      'Powered by Soroban smart contracts. Auditable, open-source, and deployed on one of the fastest blockchains on Earth.',
    size: 'large',
    accent: '#3ECF8E',
    visual: 'stellar',
  },
  {
    icon: Lock,
    title: 'Self-Custodial',
    description: 'Your keys, your money. Orbi never holds your funds.',
    size: 'medium',
    accent: '#6EDFA8',
    visual: null,
  },
  {
    icon: ShieldCheck,
    title: 'Freeze Protection',
    description: 'Stolen phone? Freeze your wallet remotely — even without your device.',
    size: 'medium',
    accent: '#3ECF8E',
    visual: null,
  },
];

function PasskeyVisual() {
  return (
    <div className="relative mt-6 flex items-center justify-center h-28">
      <div className="w-20 h-20 rounded-3xl bg-orbi-green/[0.08] border border-orbi-green/[0.20] flex items-center justify-center">
        <Fingerprint size={40} className="text-orbi-green" strokeWidth={1.5} />
      </div>
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-3xl border border-orbi-green/[0.12]"
          animate={{ scale: [1, 1.6 + i * 0.4], opacity: [0.4, 0] }}
          transition={{ duration: 2, delay: i * 0.5, repeat: Infinity, ease: 'easeOut' }}
          style={{ width: 80, height: 80 }}
        />
      ))}
    </div>
  );
}

function SpeedVisual() {
  return (
    <div className="mt-4 flex items-end gap-1 h-16 px-2">
      {[40, 65, 45, 80, 55, 90, 70, 100].map((h, i) => (
        <motion.div
          key={i}
          className="flex-1 rounded-sm bg-orbi-green/20"
          initial={{ height: 0 }}
          whileInView={{ height: `${h}%` }}
          transition={{ duration: 0.5, delay: i * 0.07, ease: 'easeOut' }}
          viewport={{ once: true }}
          style={{ position: 'relative' }}
        >
          {i === 7 && (
            <div className="absolute inset-0 bg-orbi-green rounded-sm" />
          )}
        </motion.div>
      ))}
    </div>
  );
}

function StellarVisual() {
  return (
    <div className="mt-4 flex items-center gap-3">
      <div className="flex -space-x-2">
        {['#3ECF8E', '#6EDFA8', '#29A86E'].map((c, i) => (
          <div
            key={i}
            className="w-8 h-8 rounded-full border-2 border-[#161616] flex items-center justify-center text-[10px] font-bold"
            style={{ background: c + '20', borderColor: c + '40', color: c }}
          >
            {['XLM', 'SC', 'TX'][i]}
          </div>
        ))}
      </div>
      <div className="flex-1 h-px bg-gradient-to-r from-orbi-green/40 to-transparent" />
      <div className="px-2 py-0.5 rounded bg-orbi-green/10 border border-orbi-green/20 text-orbi-green text-xs font-mono">
        ~3s
      </div>
    </div>
  );
}

interface FeatureCardProps {
  feature: typeof features[0];
  index: number;
}

function FeatureCard({ feature, index }: FeatureCardProps) {
  const Icon = feature.icon;
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="group relative rounded-2xl border border-white/[0.07] overflow-hidden h-full"
      style={{ background: 'rgba(255,255,255,0.02)' }}
    >
      {/* Hover glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 60% 50% at 50% 0%, ${feature.accent}0A 0%, transparent 70%)`,
        }}
      />

      {/* Top border accent */}
      <div
        className="absolute inset-x-0 top-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `linear-gradient(90deg, transparent, ${feature.accent}50, transparent)`,
        }}
      />

      <div className="relative p-6 flex flex-col h-full">
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 border"
          style={{
            background: feature.accent + '12',
            borderColor: feature.accent + '25',
          }}
        >
          <Icon size={20} style={{ color: feature.accent }} strokeWidth={1.5} />
        </div>

        {/* Text */}
        <h3 className="font-display text-lg font-semibold text-ink mb-2">
          {feature.title}
        </h3>
        <p className="text-sm text-ink-secondary leading-relaxed">
          {feature.description}
        </p>

        {/* Optional visual */}
        {feature.visual === 'passkey' && <PasskeyVisual />}
        {feature.visual === 'speed'   && <SpeedVisual />}
        {feature.visual === 'stellar' && <StellarVisual />}
      </div>
    </motion.div>
  );
}

export function Features() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="features" className="relative py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[#0D0D0D]" />
      <div
        className="absolute inset-0 opacity-100"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative max-w-6xl mx-auto px-6">
        {/* Section label */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-orbi-green/25 bg-orbi-green/[0.06] mb-6">
            <div className="w-1 h-1 rounded-full bg-orbi-green" />
            <span className="text-xs font-medium text-orbi-green tracking-wide uppercase">
              Everything you need
            </span>
          </div>
          <h2 className="font-display text-[clamp(36px,5vw,56px)] font-semibold text-ink leading-tight tracking-tight mb-4">
            Built for the real world.
          </h2>
          <p className="text-ink-secondary text-lg max-w-xl mx-auto">
            Not just another wallet. Orbi is a smart contract wallet designed for
            everyday payments — fast, secure, and actually simple.
          </p>
        </motion.div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Row 1 */}
          <div className="md:col-span-2">
            <FeatureCard feature={features[0]} index={0} />
          </div>
          <div className="md:col-span-1">
            <FeatureCard feature={features[1]} index={1} />
          </div>

          {/* Row 2 */}
          <div className="md:col-span-1">
            <FeatureCard feature={features[2]} index={2} />
          </div>
          <div className="md:col-span-2">
            <FeatureCard feature={features[3]} index={3} />
          </div>

          {/* Row 3 */}
          <div className="md:col-span-1">
            <FeatureCard feature={features[4]} index={4} />
          </div>
          <div className="md:col-span-1">
            <FeatureCard feature={features[5]} index={5} />
          </div>
          {/* Stats card */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, delay: 0.48 }}
            className="md:col-span-1 rounded-2xl border border-orbi-green/[0.15] overflow-hidden relative"
            style={{ background: 'rgba(62,207,142,0.04)' }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_50%,rgba(62,207,142,0.06)_0%,transparent_70%)]" />
            <div className="relative p-6 flex flex-col justify-between h-full min-h-[160px]">
              <div className="font-display text-5xl font-bold text-orbi-green">~3s</div>
              <div>
                <div className="text-ink font-semibold mb-1">Settlement Time</div>
                <div className="text-sm text-ink-secondary">
                  Average time for a confirmed transaction on Stellar.
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
