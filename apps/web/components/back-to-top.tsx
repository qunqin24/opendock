'use client';

import { ArrowUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

const R = 22;
const CIRC = 2 * Math.PI * R;

/**
 * Back to top. A ring around the button fills as you read down the page;
 * hovering lifts it and shows how far you are; clicking sends the arrow up
 * and out while the page scrolls home, and the ring drains with it.
 */
export function BackToTop() {
  const t = useTranslations('backToTop');
  const ringRef = useRef<SVGCircleElement>(null);
  const [visible, setVisible] = useState(false);
  const [percent, setPercent] = useState(0);
  const [flying, setFlying] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      if (ringRef.current) ringRef.current.style.strokeDashoffset = String(CIRC * (1 - p));
      setPercent(Math.round(p * 100));
      setVisible(window.scrollY > window.innerHeight * 0.8);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  function toTop() {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) {
      setFlying(true);
      setTimeout(() => setFlying(false), 650);
    }
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    document.querySelector<HTMLElement>('#main')?.focus({ preventScroll: true });
  }

  return (
    <div className={`to-top fixed right-5 bottom-5 z-40 sm:right-8 sm:bottom-8 ${visible ? 'is-visible' : ''}`}>
      <span aria-hidden className="to-top-tip">
        {t('label')} <span className="font-[family-name:var(--font-site-mono)] text-[var(--faint)] tabular-nums">{percent}%</span>
      </span>
      <button
        type="button"
        onClick={toTop}
        aria-label={t('aria', { percent: String(percent) })}
        tabIndex={visible ? 0 : -1}
        aria-hidden={!visible}
        className={`to-top-btn ${flying ? 'is-flying' : ''}`}
      >
        <svg aria-hidden viewBox="0 0 48 48" className="to-top-ring">
          <circle cx="24" cy="24" r={R} className="to-top-track" />
          <circle ref={ringRef} cx="24" cy="24" r={R} className="to-top-progress" strokeDasharray={CIRC} strokeDashoffset={CIRC} />
        </svg>
        <span className="to-top-arrow">
          <ArrowUp aria-hidden strokeWidth={2} className="size-[18px]" />
        </span>
      </button>
    </div>
  );
}
