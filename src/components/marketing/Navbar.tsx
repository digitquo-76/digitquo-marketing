'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LogoMark, ArrowRightIcon } from '../ui/icons';

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    const updateScrolled = () => setScrolled(window.scrollY > 40);
    updateScrolled();
    window.addEventListener('scroll', updateScrolled, { passive: true });
    return () => window.removeEventListener('scroll', updateScrolled);
  }, []);

  useEffect(() => {
    const sections = ['features', 'how-it-works', 'roles', 'testimonials', 'contact'];
    const updateActiveSection = () => {
      const navbarHeight = document.getElementById('navbar')?.offsetHeight || 0;
      const marker = window.scrollY + navbarHeight + window.innerHeight * 0.28;
      let active = '';
      sections.forEach((id) => {
        const section = document.getElementById(id);
        if (section && marker >= section.offsetTop) active = id;
      });
      setActiveSection(active);
    };
    updateActiveSection();
    window.addEventListener('scroll', updateActiveSection, { passive: true });
    window.addEventListener('resize', updateActiveSection);
    return () => {
      window.removeEventListener('scroll', updateActiveSection);
      window.removeEventListener('resize', updateActiveSection);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const closeMobile = () => setMobileOpen(false);

  return (
    <nav id="navbar" className={`navbar${scrolled ? ' scrolled' : ''}`}>
      <div className="container nav-container">
        <Link href="/" className="logo" id="logo" onClick={closeMobile}>
          <LogoMark />
          <span className="logo-text">DigitQuo Store</span>
        </Link>
        <ul className={`nav-links${mobileOpen ? ' mobile-open' : ''}`} id="nav-links">
          {[
            ['features', 'Features'],
            ['how-it-works', 'How It Works'],
            ['roles', "Who It's For"],
            ['testimonials', 'Testimonials'],
            ['contact', 'Contact']
          ].map(([id, label]) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className={activeSection === id ? 'active' : ''}
                aria-current={activeSection === id ? 'location' : undefined}
                onClick={closeMobile}
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
        <div className={`nav-actions${mobileOpen ? ' mobile-open' : ''}`} id="nav-actions">
          <Link href="/login" className="btn btn-ghost" id="btn-login">Log In</Link>
          <Link href="/register" className="btn btn-primary" id="btn-get-started" onClick={closeMobile}>
            Get Started <ArrowRightIcon size={14} />
          </Link>
        </div>
        <button
          className={`hamburger${mobileOpen ? ' active' : ''}`}
          id="hamburger"
          type="button"
          aria-label="Toggle navigation menu"
          onClick={() => setMobileOpen((open) => !open)}
        >
          <span /><span /><span />
        </button>
      </div>
    </nav>
  );
}
