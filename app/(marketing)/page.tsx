import { Navbar } from '@/components/marketing/Navbar';
import { HeroStat, RevealProvider } from '@/components/marketing/HeroStat';
import { FeaturesSection, HowItWorksSection, RolesSection, TestimonialsSection, CtaSection } from '@/components/marketing/Sections';
import { Footer } from '@/components/marketing/Footer';
import { ArrowRightIcon, PlayIcon } from '@/components/ui/icons';

export default function LandingPage() {
  return (
    <>
      <RevealProvider />
      <div className="bg-effects" aria-hidden="true">
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />
        <div className="bg-grid" />
      </div>

      <Navbar />

      <header id="hero" className="hero">
        <div className="container hero-inner">
          <div className="hero-badge reveal">
            <span className="badge-dot" />
            <span>Now open for early access</span>
          </div>
          <h1 className="hero-title reveal reveal-delay-1">
            The marketplace<br />built for <span className="text-gradient">modern trade</span>
          </h1>
          <p className="hero-subtitle reveal reveal-delay-2">
            DigitQuo connects sellers and brokers on one seamless platform.<br className="hide-mobile" />
            List products, discover deals, and scale your business - effortlessly.
          </p>
          <div className="hero-cta reveal reveal-delay-3">
            <a href="#roles" className="btn btn-primary btn-lg" id="hero-cta-start">
              Start for free <ArrowRightIcon size={16} />
            </a>
            <a href="#how-it-works" className="btn btn-glass btn-lg" id="hero-cta-learn">
              <PlayIcon /> See how it works
            </a>
          </div>
          <div className="hero-stats reveal reveal-delay-4">
            <HeroStat target={2500} suffix="+" label="Sellers" />
            <div className="hero-stat-divider" />
            <HeroStat target={800} suffix="+" label="Active Brokers" />
            <div className="hero-stat-divider" />
            <HeroStat target={15000} suffix="+" label="Products Listed" />
            <div className="hero-stat-divider" />
            <HeroStat target={98} suffix="%" label="Satisfaction" />
          </div>
        </div>
      </header>

      <section className="brand-bar">
        <div className="container">
          <p className="brand-bar-text reveal">Trusted by growing businesses across the country</p>
        </div>
      </section>

      <FeaturesSection />
      <HowItWorksSection />
      <RolesSection />
      <TestimonialsSection />
      <CtaSection />
      <Footer />
    </>
  );
}
