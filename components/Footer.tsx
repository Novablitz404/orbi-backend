import Image from 'next/image';

const links = {
  Product:  ['Features', 'Security', 'How it Works', 'Download'],
  Resources: ['Docs', 'GitHub', 'Stellar Explorer', 'Soroban'],
  Company:  ['About', 'Blog', 'Contact'],
};

export function Footer() {
  return (
    <footer className="relative border-t border-white/[0.06] bg-[#0D0D0D]">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-16">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-xl bg-orbi-green flex items-center justify-center">
                <Image src="/orbi_icon.png" alt="Orbi" width={20} height={20} className="rounded" />
              </div>
              <span className="font-display text-xl font-semibold text-ink">Orbi</span>
            </div>
            <p className="text-sm text-ink-muted leading-relaxed max-w-[200px]">
              The smartest wallet on Stellar. Passkey-secured, self-custodial.
            </p>
            <div className="mt-6 flex items-center gap-1.5 text-xs text-ink-muted">
              <div className="w-1.5 h-1.5 rounded-full bg-orbi-green animate-pulse" />
              Live on Testnet
            </div>
          </div>

          {/* Links */}
          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <div className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-4">
                {category}
              </div>
              <ul className="flex flex-col gap-3">
                {items.map(item => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-sm text-ink-secondary hover:text-ink transition-colors duration-200"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="border-t border-white/[0.06] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-ink-muted">
            © 2026 Orbi. Built on{' '}
            <a href="https://stellar.org" className="text-orbi-green/70 hover:text-orbi-green transition-colors">
              Stellar
            </a>
            .
          </p>
          <div className="flex items-center gap-6">
            {['Privacy Policy', 'Terms of Service'].map(item => (
              <a
                key={item}
                href="#"
                className="text-xs text-ink-muted hover:text-ink-secondary transition-colors"
              >
                {item}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
