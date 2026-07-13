import Link from 'next/link';
import { LayersIcon, SearchIcon, ShieldIcon, ChartIcon, ClockIcon, UsersIcon, HomeIcon, CheckIcon, MessageIcon, ArrowRightIcon } from '../ui/icons';
import { HeroStat } from './HeroStat';

export function FeaturesSection() {
  const features = [
    ['Effortless Listings', 'Add products in seconds with our streamlined listing flow. Upload photos, set prices, and go live - no complexity.', <LayersIcon key="layers" />],
    ['Smart Discovery', 'Brokers discover exactly the products their customers need with intelligent filters and real-time availability.', <SearchIcon key="search" />],
    ['Secure & Trusted', 'Every transaction is protected. Verified sellers, transparent deals, and complete peace of mind on every order.', <ShieldIcon key="shield" />],
    ['Real-time Analytics', 'Track sales, views, and performance with a clean dashboard. Make data-driven decisions that grow your margins.', <ChartIcon key="chart" />]
  ] as const;

  return (
    <section id="features" className="section features">
      <div className="container">
        <SectionHeader tag="Why DigitQuo Store" icon={<StarIcon key="star" />} title={<>Everything you need,<br />nothing you don't.</>} subtitle="Powerful features designed to make marketing and selling simple, fast, and profitable." />
        <div className="features-grid">
          {features.map(([title, desc, icon], index) => (
            <div className={`feature-card reveal${index ? ` reveal-delay-${index}` : ''}`} key={title as string}>
              <div className="feature-icon">{icon}</div>
              <h3 className="feature-title">{title}</h3>
              <p className="feature-desc">{desc}</p>
              <span className="feature-link">Learn more →</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HowItWorksSection() {
  const steps = [
    ['01', 'Create Your Account', "Sign up as a Seller or Broker. It takes under a minute - no credit card required. Just your email and you're in."],
    ['02', 'List or Browse Products', 'Sellers list products with photos and pricing. Brokers browse the catalog and connect directly with sellers.'],
    ['03', 'Sell & Grow', 'Close deals, track your performance with real-time analytics, and scale your business with data-driven insights.']
  ] as const;

  return (
    <section id="how-it-works" className="section how-it-works">
      <div className="container">
        <SectionHeader tag="How It Works" icon={<ClockIcon key="clock" />} title={<>Three simple steps.<br />Zero complexity.</>} subtitle="Get started in under a minute and start growing your business today." />
        <div className="steps-grid">
          {steps.map(([number, title, desc], index) => (
            <div className={`step-card reveal${index ? ` reveal-delay-${index}` : ''}`} key={number as string}>
              <div className="step-number-wrap">
                <span className="step-number">{number}</span>
                {index < 2 && <div className="step-line" />}
              </div>
              <div className="step-content">
                <h3 className="step-title">{title}</h3>
                <p className="step-desc">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function RolesSection() {
  return (
    <section id="roles" className="section roles">
      <div className="container">
        <SectionHeader tag="Who It's For" icon={<UsersIcon key="users" />} title={<>Built for both sides<br />of modern trade.</>} subtitle="Whether you sell products or source the right deals - there's a dashboard built for you." />
        <div className="roles-grid">
          <RoleCard
            title="Sellers"
            desc="List your products, set your prices, and let brokers find you. Manage everything from a single dashboard."
            features={['Product catalog management', 'Inventory tracking', 'Order notifications', 'Sales analytics']}
            href="/register?role=seller"
            cta="Become a Seller →"
            icon={<HomeIcon />}
          />
          <RoleCard
            featured
            title="Brokers"
            desc="Discover products from verified sellers. Buy in bulk, resell to your network, and earn on every deal."
            features={['Advanced product search', 'Bulk order management', 'Commission tracking', 'Buyer network tools']}
            href="/register?role=broker"
            cta="Become a Broker →"
            icon={<UsersIcon size={28} />}
          />
        </div>
      </div>
    </section>
  );
}

function RoleCard({ title, desc, features, href, cta, icon, featured = false }: any) {
  return (
    <div className={`role-card${featured ? ' role-card-featured reveal reveal-delay-1' : ' reveal'}`}>
      {featured && <div className="role-badge">Most Popular</div>}
      <div className="role-icon-wrap">{icon}</div>
      <h3 className="role-title">{title}</h3>
      <p className="role-desc">{desc}</p>
      <ul className="role-features">
        {features.map((feature: string) => (
          <li key={feature}><CheckIcon />{feature}</li>
        ))}
      </ul>
      <Link href={href} className={`btn ${featured ? 'btn-primary' : 'btn-glass'} btn-sm`}>{cta}</Link>
    </div>
  );
}

export function TestimonialsSection() {
  const testimonials = [
    ['RK', 'Rahul Kumar', 'Seller, Delhi', '"DigitQuo Store transformed how I sell. I listed my products once, and brokers started reaching out within hours. It\'s the simplest tool I\'ve ever used."'],
    ['PS', 'Priya Sharma', 'Broker, Mumbai', '"As a broker, finding quality products used to take days. Now I browse, connect, and close deals - all from one place. Absolute game changer."'],
    ['NM', 'Neha Malhotra', 'Seller, Jaipur', '"The analytics make it easy to see which products are moving and where to focus next. Clean, fast, and genuinely useful."']
  ] as const;

  return (
    <section id="testimonials" className="section testimonials">
      <div className="container">
        <SectionHeader tag="Testimonials" icon={<MessageIcon key="msg" />} title={<>Loved by businesses<br />that move fast.</>} />
        <div className="testimonials-grid">
          {testimonials.map(([initials, name, role, text], index) => (
            <div className={`testimonial-card reveal${index ? ` reveal-delay-${index}` : ''}`} key={name as string}>
              <div className="testimonial-stars">★★★★★</div>
              <p className="testimonial-text">{text}</p>
              <div className="testimonial-author">
                <div className="testimonial-avatar">{initials}</div>
                <div>
                  <p className="testimonial-name">{name}</p>
                  <p className="testimonial-role">{role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CtaSection() {
  return (
    <section id="contact" className="section cta-section">
      <div className="container">
        <div className="cta-box reveal">
          <div className="cta-glow" />
          <h2 className="cta-title">Ready to grow your business?</h2>
          <p className="cta-desc">Join thousands of sellers and brokers already thriving on DigitQuo Store. Start free - no credit card needed.</p>
          <div className="cta-actions">
            <a href="#roles" className="btn btn-primary btn-lg" id="cta-start">Get started today <ArrowRightIcon size={16} /></a>
            <a href="mailto:sales@digitquo.in?subject=DigitQuo%20Store%20sales%20inquiry" className="btn btn-glass btn-lg" id="cta-contact">Talk to sales</a>
          </div>
        </div>
      </div>
    </section>
  );
}

export function SectionHeader({ tag, icon, title, subtitle }: { tag: string, icon: React.ReactNode, title: React.ReactNode, subtitle?: string }) {
  return (
    <div className="section-header">
      <span className="section-tag reveal">{icon}{tag}</span>
      <h2 className="section-title reveal reveal-delay-1">{title}</h2>
      {subtitle && <p className="section-subtitle reveal reveal-delay-2">{subtitle}</p>}
    </div>
  );
}

// Need StarIcon which is used in FeaturesSection but defined in icons.tsx
import { StarIcon } from '../ui/icons';
