import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

import { AntarbodhMark } from '../branding/AntarbodhMark';
import { toneAt, useScrollFrame, type Tone } from './dive';

const SECTIONS = [
  { href: '#how', label: 'How it works' },
  { href: '#bay', label: 'The Bay' },
  { href: '#tools', label: 'Tools' },
  { href: '#faq', label: 'Questions' },
] as const;

export function LandingNav() {
  const [tone, setTone] = useState<Tone>('light');
  const [open, setOpen] = useState(false);

  // The bar takes the tone of the water it is floating over.
  useScrollFrame(() => setTone(toneAt(40)));

  useEffect(() => {
    if (!open) return;

    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open]);

  return (
    <header className="l-nav" data-tone={tone}>
      <div className="l-nav__bar">
        <a href="#top" className="l-brand" aria-label="Antarbodh, back to top">
          <AntarbodhMark size={24} />
          <span className="l-brand__latin">Antarbodh</span>
          <span className="l-brand__deva" lang="hi">
            अंतर्बोध
          </span>
        </a>

        <nav className="l-nav__links" aria-label="Sections">
          {SECTIONS.map(({ href, label }) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
        </nav>

        <Link to="/explore" className="l-btn l-btn--kesar l-nav__cta">
          Open the explorer
        </Link>

        <button
          type="button"
          className="l-nav__toggle"
          aria-expanded={open}
          aria-controls="l-nav-sheet"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {open && (
        <div id="l-nav-sheet" className="l-nav__sheet">
          {SECTIONS.map(({ href, label }) => (
            <a key={href} href={href} onClick={() => setOpen(false)}>
              {label}
            </a>
          ))}

          <Link to="/explore" className="l-btn l-btn--kesar">
            Open the explorer
          </Link>
        </div>
      )}
    </header>
  );
}
