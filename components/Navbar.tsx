'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';

const links = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Security', href: '#security' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-[#0D0D0D]/80 backdrop-blur-xl border-b border-white/[0.06] shadow-[0_1px_0_rgba(255,255,255,0.04)]'
            : 'bg-transparent'
        }`}
      >
        <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-orbi-green flex items-center justify-center shadow-[0_0_20px_rgba(62,207,142,0.4)]">
              <Image src="/orbi_icon.png" alt="Orbi" width={20} height={20} className="rounded" />
            </div>
            <span className="font-display text-xl font-semibold text-ink">Orbi</span>
          </a>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8">
            {links.map(l => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm text-ink-secondary hover:text-ink transition-colors duration-200"
              >
                {l.label}
              </a>
            ))}
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href="#download"
              className="px-5 py-2 rounded-full bg-orbi-green text-black text-sm font-semibold hover:bg-orbi-green-lt transition-all duration-200 hover:shadow-[0_0_20px_rgba(62,207,142,0.35)]"
            >
              Get the App
            </a>
          </div>

          {/* Mobile burger */}
          <button
            className="md:hidden p-2 text-ink-secondary hover:text-ink transition-colors"
            onClick={() => setOpen(o => !o)}
            aria-label="Toggle menu"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </nav>
      </motion.header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 top-16 z-40 md:hidden bg-[#0D0D0D]/95 backdrop-blur-xl border-b border-white/[0.06] px-6 py-6 flex flex-col gap-4"
          >
            {links.map(l => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="text-base text-ink-secondary hover:text-ink transition-colors"
              >
                {l.label}
              </a>
            ))}
            <a
              href="#download"
              onClick={() => setOpen(false)}
              className="mt-2 px-5 py-3 rounded-full bg-orbi-green text-black text-sm font-semibold text-center"
            >
              Get the App
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
