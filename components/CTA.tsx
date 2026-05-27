'use client';
import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { ArrowRight, Smartphone } from 'lucide-react';
import Image from 'next/image';

export function CTA() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="download" className="relative py-32 overflow-hidden">
      <div className="absolute inset-0 bg-[#0D0D0D]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      {/* Green glow center */}
      <div className="absolute inset-x-0 inset-y-0 bg-[radial-gradient(ellipse_70%_70%_at_50%_50%,rgba(62,207,142,0.08)_0%,transparent_70%)]" />

      <div className="relative max-w-3xl mx-auto px-6 text-center">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Logo mark */}
          <div className="mb-8 flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-orbi-green flex items-center justify-center shadow-[0_0_40px_rgba(62,207,142,0.40)]">
              <Image src="/orbi_icon.png" alt="Orbi" width={36} height={36} className="rounded" />
            </div>
          </div>

          <h2 className="font-display text-[clamp(40px,6vw,72px)] font-semibold text-ink leading-tight tracking-tight mb-6">
            Your wallet.
            <br />
            <span className="text-orbi-green">Redefined.</span>
          </h2>

          <p className="text-ink-secondary text-lg leading-relaxed mb-12 max-w-xl mx-auto">
            Join the next generation of Stellar payments. Download Orbi today and
            experience what a self-custodial wallet should feel like.
          </p>

          {/* Download button */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <motion.a
              href="#"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="group flex items-center gap-3 px-8 py-4 rounded-2xl btn-shimmer text-black font-semibold text-base shadow-[0_0_40px_rgba(62,207,142,0.35)] hover:shadow-[0_0_60px_rgba(62,207,142,0.50)] transition-shadow duration-300"
            >
              <Smartphone size={20} />
              <span>Download for Android</span>
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform duration-200" />
            </motion.a>
          </div>

          {/* Fine print */}
          <p className="mt-8 text-xs text-ink-muted">
            Requires Android 8.0+. Currently on Stellar Testnet.
          </p>

          {/* Trust badges */}
          <div className="mt-12 flex items-center justify-center gap-6 flex-wrap">
            {['Self-custodial', 'Open source', 'Soroban powered', 'Zero fees'].map(badge => (
              <div key={badge} className="flex items-center gap-1.5 text-xs text-ink-muted">
                <div className="w-1 h-1 rounded-full bg-orbi-green/60" />
                {badge}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
