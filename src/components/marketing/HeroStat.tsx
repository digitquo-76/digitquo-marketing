'use client';

import { useEffect } from 'react';
import { formatNumber } from '../../lib/utils';

export function HeroStat({ target, suffix, label }: { target: number, suffix: string, label: string }) {
  return (
    <div className="hero-stat-card">
      <span className="hero-stat-number">{formatNumber(target)}</span>
      <span className="hero-stat-suffix">{suffix}</span>
      <span className="hero-stat-label">{label}</span>
    </div>
  );
}

export function RevealProvider() {
  useEffect(() => {
    const elements = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);
  
  return null;
}
