'use client';

import { useEffect, useRef, useState } from 'react';
import { formatNumber } from '@/lib/utils';

export function HeroStat({ target, suffix, label }: { target: number, suffix: string, label: string }) {
  const value = useCountUp(target);
  return (
    <div className="hero-stat-card">
      <span className="hero-stat-number" data-target={target}>{formatNumber(value)}</span>
      <span className="hero-stat-suffix">{suffix}</span>
      <span className="hero-stat-label">{label}</span>
    </div>
  );
}

function useCountUp(target: number) {
  const [value, setValue] = useState(0);
  const ref = useRef(false);

  useEffect(() => {
    const element = document.querySelector(`[data-target="${target}"]`);
    if (!element) return undefined;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !ref.current) {
          ref.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const progress = Math.min((now - start) / 1800, 1);
            const eased = 1 - Math.pow(1 - progress, 4);
            setValue(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          observer.disconnect();
        }
      });
    }, { threshold: 0.5 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [target]);

  return value;
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
