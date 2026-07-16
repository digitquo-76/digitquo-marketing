'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LogoMark, ArrowRightIcon } from '../ui/icons';

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    const sectionIds = ['features', 'how-it-works', 'roles', 'testimonials', 'contact'];
    let sectionOffsets: [string, number][] = [];
    let viewportHeight = window.innerHeight;
    let frameId = 0;

    const measure = () => {
      viewportHeight = window.innerHeight;
      sectionOffsets = sectionIds.flatMap((id) => {
        const section = document.getElementById(id);
        return section ? [[id, section.offsetTop] as [string, number]] : [];
      });
    };

    const update = () => {
      frameId = 0;
      setScrolled(window.scrollY > 40);
      const navbarHeight = document.getElementById('navbar')?.offsetHeight || 0;
      const marker = window.scrollY + navbarHeight + viewportHeight * 0.28;
      let active = '';
      sectionOffsets.forEach(([id, offsetTop]) => {
        if (marker >= offsetTop) active = id;
      });
      setActiveSection(active);
    };

    const scheduleUpdate = () => {
      if (!frameId) frameId = window.requestAnimationFrame(update);
    };
    const handleResize = () => {
      measure();
      scheduleUpdate();
    };

    measure();
    update();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', handleResize);
    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', handleResize);
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
    <nav id="navbar" className={`navbar${scrolled ? ' scrolled' : ''}${mobileOpen ? ' mobile-open' : ''}`}>
      <div className="container nav-container">
        <Link href="/" className="logo" id="logo" onClick={closeMobile}>
          <LogoMark />
          <span className="logo-text">DigitQuo Store</span>
        </Link>
        <div className={`nav-menu${mobileOpen ? ' mobile-open' : ''}`} id="nav-menu">
          <ul className="nav-links" id="nav-links">
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
          <div className="nav-actions" id="nav-actions">
            <Link href="/login" className="btn btn-ghost" id="btn-login" onClick={closeMobile}>Log In</Link>
            <Link href="/register" className="btn btn-primary" id="btn-get-started" onClick={closeMobile}>
              Get Started <ArrowRightIcon size={14} />
            </Link>
          </div>
        </div>
        <button
          className={`hamburger${mobileOpen ? ' active' : ''}`}
          id="hamburger"
          type="button"
          aria-label="Toggle navigation menu"
          aria-expanded={mobileOpen}
          aria-controls="nav-menu"
          onClick={() => setMobileOpen((open) => !open)}
        >
          <span /><span /><span />
        </button>
      </div>
    </nav>
  );
}
