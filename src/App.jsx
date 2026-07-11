import { useEffect, useMemo, useRef, useState } from 'react';

const DQ_KEYS = {
  products: 'digitquo_products_v1',
  sales: 'digitquo_sales_v1',
  activity: 'digitquo_activity_v1'
};

const CURRENT_SHOPKEEPER = 'My Store';
const CURRENT_BROKER = 'Partner Broker';

function App() {
  const [path, setPath] = useState(window.location.pathname);
  const route = getRoute(path);
  const isPanel = route !== 'landing';

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.route = isPanel ? 'panel' : 'landing';
    document.body.dataset.panel = isPanel ? route : '';
    document.body.classList.remove('sidebar-open');
    document.body.style.overflow = '';
    document.documentElement.scrollTop = 0;

    let robotsMeta = document.querySelector('meta[name="robots"]');
    if (route === 'admin') {
      if (!robotsMeta) {
        robotsMeta = document.createElement('meta');
        robotsMeta.name = 'robots';
        document.head.appendChild(robotsMeta);
      }
      robotsMeta.content = 'noindex, nofollow';
    } else if (robotsMeta) {
      robotsMeta.remove();
    }
  }, [isPanel, route]);

  if (route === 'shopkeeper') return <ShopkeeperPanel />;
  if (route === 'broker') return <BrokerPanel />;
  if (route === 'admin') return <AdminPanel />;
  return <LandingPage />;
}

export default App;

function getRoute(pathname) {
  const page = pathname.replace(/^\/+|\/+$/g, '') || '';
  if (page === 'shopkeeper') return 'shopkeeper';
  if (page === 'broker') return 'broker';
  if (page === 'admin') return 'admin';
  return 'landing';
}

function AppLink({ href, children, onClick, ...props }) {
  const handleClick = (event) => {
    onClick?.(event);
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      !href?.startsWith('/')
    ) {
      return;
    }

    event.preventDefault();
    if (window.location.pathname !== href) {
      window.history.pushState({}, '', href);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return <a href={href} onClick={handleClick} {...props}>{children}</a>;
}

function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    document.title = 'DigitQuo - The Smarter Way to Market & Sell';
  }, []);

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

  useReveal();

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      <div className="bg-effects" aria-hidden="true">
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />
        <div className="bg-grid" />
      </div>

      <nav id="navbar" className={`navbar${scrolled ? ' scrolled' : ''}`}>
        <div className="container nav-container">
          <a href="#" className="logo" id="logo">
            <LogoMark />
            <span className="logo-text">DigitQuo</span>
          </a>
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
            <AppLink href="/shopkeeper" className="btn btn-ghost" id="btn-login">Open panel</AppLink>
            <a href="#roles" className="btn btn-primary" id="btn-get-started" onClick={closeMobile}>
              Get Started <ArrowRightIcon size={14} />
            </a>
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

function useReveal() {
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
}

function HeroStat({ target, suffix, label }) {
  const value = useCountUp(target);
  return (
    <div className="hero-stat-card">
      <span className="hero-stat-number" data-target={target}>{formatNumber(value)}</span>
      <span className="hero-stat-suffix">{suffix}</span>
      <span className="hero-stat-label">{label}</span>
    </div>
  );
}

function useCountUp(target) {
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
          const tick = (now) => {
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

function FeaturesSection() {
  const features = [
    ['Effortless Listings', 'Add products in seconds with our streamlined listing flow. Upload photos, set prices, and go live - no complexity.', <LayersIcon />],
    ['Smart Discovery', 'Brokers discover exactly the products their customers need with intelligent filters and real-time availability.', <SearchIcon />],
    ['Secure & Trusted', 'Every transaction is protected. Verified sellers, transparent deals, and complete peace of mind on every order.', <ShieldIcon />],
    ['Real-time Analytics', 'Track sales, views, and performance with a clean dashboard. Make data-driven decisions that grow your margins.', <ChartIcon />]
  ];

  return (
    <section id="features" className="section features">
      <div className="container">
        <SectionHeader tag="Why DigitQuo" icon={<StarIcon />} title={<>Everything you need,<br />nothing you don't.</>} subtitle="Powerful features designed to make marketing and selling simple, fast, and profitable." />
        <div className="features-grid">
          {features.map(([title, desc, icon], index) => (
            <div className={`feature-card reveal${index ? ` reveal-delay-${index}` : ''}`} key={title}>
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

function HowItWorksSection() {
  const steps = [
    ['01', 'Create Your Account', "Sign up as a Seller or Broker. It takes under a minute - no credit card required. Just your email and you're in."],
    ['02', 'List or Browse Products', 'Sellers list products with photos and pricing. Brokers browse the catalog and connect directly with sellers.'],
    ['03', 'Sell & Grow', 'Close deals, track your performance with real-time analytics, and scale your business with data-driven insights.']
  ];

  return (
    <section id="how-it-works" className="section how-it-works">
      <div className="container">
        <SectionHeader tag="How It Works" icon={<ClockIcon />} title={<>Three simple steps.<br />Zero complexity.</>} subtitle="Get started in under a minute and start growing your business today." />
        <div className="steps-grid">
          {steps.map(([number, title, desc], index) => (
            <div className={`step-card reveal${index ? ` reveal-delay-${index}` : ''}`} key={number}>
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

function RolesSection() {
  return (
    <section id="roles" className="section roles">
      <div className="container">
        <SectionHeader tag="Who It's For" icon={<UsersIcon />} title={<>Built for both sides<br />of modern trade.</>} subtitle="Whether you sell products or source the right deals - there's a panel built for you." />
        <div className="roles-grid">
          <RoleCard
            title="Sellers"
            desc="List your products, set your prices, and let brokers find you. Manage everything from a single dashboard."
            features={['Product catalog management', 'Inventory tracking', 'Order notifications', 'Sales analytics']}
            href="/shopkeeper"
            cta="Become a Seller →"
            icon={<HomeIcon />}
          />
          <RoleCard
            featured
            title="Brokers"
            desc="Discover products from verified sellers. Buy in bulk, resell to your network, and earn on every deal."
            features={['Advanced product search', 'Bulk order management', 'Commission tracking', 'Buyer network tools']}
            href="/broker"
            cta="Become a Broker →"
            icon={<UsersIcon size={28} />}
          />
        </div>
      </div>
    </section>
  );
}

function RoleCard({ title, desc, features, href, cta, icon, featured = false }) {
  return (
    <div className={`role-card${featured ? ' role-card-featured reveal reveal-delay-1' : ' reveal'}`}>
      {featured && <div className="role-badge">Most Popular</div>}
      <div className="role-icon-wrap">{icon}</div>
      <h3 className="role-title">{title}</h3>
      <p className="role-desc">{desc}</p>
      <ul className="role-features">
        {features.map((feature) => (
          <li key={feature}><CheckIcon />{feature}</li>
        ))}
      </ul>
      <AppLink href={href} className={`btn ${featured ? 'btn-primary' : 'btn-glass'} btn-sm`}>{cta}</AppLink>
    </div>
  );
}

function TestimonialsSection() {
  const testimonials = [
    ['RK', 'Rahul Kumar', 'Seller, Delhi', '"DigitQuo transformed how I sell. I listed my products once, and brokers started reaching out within hours. It\'s the simplest tool I\'ve ever used."'],
    ['PS', 'Priya Sharma', 'Broker, Mumbai', '"As a broker, finding quality products used to take days. Now I browse, connect, and close deals - all from one place. Absolute game changer."'],
    ['NM', 'Neha Malhotra', 'Seller, Jaipur', '"The analytics make it easy to see which products are moving and where to focus next. Clean, fast, and genuinely useful."']
  ];

  return (
    <section id="testimonials" className="section testimonials">
      <div className="container">
        <SectionHeader tag="Testimonials" icon={<MessageIcon />} title={<>Loved by businesses<br />that move fast.</>} />
        <div className="testimonials-grid">
          {testimonials.map(([initials, name, role, text], index) => (
            <div className={`testimonial-card reveal${index ? ` reveal-delay-${index}` : ''}`} key={name}>
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

function CtaSection() {
  return (
    <section id="contact" className="section cta-section">
      <div className="container">
        <div className="cta-box reveal">
          <div className="cta-glow" />
          <h2 className="cta-title">Ready to grow your business?</h2>
          <p className="cta-desc">Join thousands of sellers and brokers already thriving on DigitQuo. Start free - no credit card needed.</p>
          <div className="cta-actions">
            <a href="#roles" className="btn btn-primary btn-lg" id="cta-start">Get started today <ArrowRightIcon size={16} /></a>
            <a href="#" className="btn btn-glass btn-lg" id="cta-contact">Talk to sales</a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <a href="#" className="logo"><LogoMark /><span className="logo-text">DigitQuo</span></a>
            <p className="footer-tagline">The smarter way to market and sell. Connecting sellers and brokers on one platform.</p>
            <div className="footer-socials">
              <a href="#" className="social-link" aria-label="Twitter"><TwitterIcon /></a>
              <a href="#" className="social-link" aria-label="LinkedIn"><LinkedInIcon /></a>
              <a href="#" className="social-link" aria-label="Instagram"><InstagramIcon /></a>
            </div>
          </div>
          <FooterCol title="Product" items={[['#features', 'Features'], ['#how-it-works', 'How It Works'], ['#', 'Pricing'], ['#', 'API']]} />
          <FooterCol title="Company" items={[['#', 'About'], ['#', 'Careers'], ['#', 'Blog'], ['#contact', 'Contact']]} />
          <FooterCol title="Legal" items={[['#', 'Privacy Policy'], ['#', 'Terms of Service'], ['#', 'Cookie Policy']]} />
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 DigitQuo. All rights reserved.</p>
          <p>Made with passion for modern trade.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, items }) {
  return (
    <div className="footer-col">
      <h4 className="footer-heading">{title}</h4>
      <ul>{items.map(([href, label]) => <li key={label}><a href={href}>{label}</a></li>)}</ul>
    </div>
  );
}

function SectionHeader({ tag, icon, title, subtitle }) {
  return (
    <div className="section-header">
      <span className="section-tag reveal">{icon}{tag}</span>
      <h2 className="section-title reveal reveal-delay-1">{title}</h2>
      {subtitle && <p className="section-subtitle reveal reveal-delay-2">{subtitle}</p>}
    </div>
  );
}

function ShopkeeperPanel() {
  const store = useDigitQuoStore();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const myProducts = store.products.filter((product) => product.seller === CURRENT_SHOPKEEPER);
  const myProductIds = new Set(myProducts.map((product) => product.id));
  const mySales = store.sales.filter((sale) => myProductIds.has(sale.productId) || sale.seller === CURRENT_SHOPKEEPER);
  const visibleProducts = myProducts.filter((product) => `${product.name} ${product.category}`.toLowerCase().includes(search.trim().toLowerCase()));
  const activity = store.activity.filter((item) => item.message.includes(CURRENT_SHOPKEEPER) || item.type === 'sale').slice(0, 6);

  useEffect(() => {
    document.title = 'Seller Panel - DigitQuo';
  }, []);

  const openAddProduct = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const saveProduct = (values) => {
    if (editing) {
      store.setProducts(store.products.map((product) => (
        product.id === editing.id && product.seller === CURRENT_SHOPKEEPER ? { ...product, ...values } : product
      )));
      store.addActivity('product', `${CURRENT_SHOPKEEPER} updated ${values.name}.`);
      store.showToast('Product updated successfully.', 'success');
    } else {
      store.setProducts([createProduct(values.name, values.category, values.price, values.stock, CURRENT_SHOPKEEPER, values.image, values.description), ...store.products]);
      store.addActivity('product', `${CURRENT_SHOPKEEPER} published ${values.name}.`);
      store.showToast('Product is now available to brokers.', 'success');
    }
    setModalOpen(false);
    setEditing(null);
  };

  const deleteProduct = (product) => {
    if (!window.confirm(`Remove "${product.name}" from your listings?`)) return;
    store.setProducts(store.products.filter((item) => item.id !== product.id));
    store.addActivity('product', `${CURRENT_SHOPKEEPER} removed ${product.name}.`);
    store.showToast('Product removed.', 'success');
  };

  return (
    <>
      <DashboardShell
        label="Seller panel"
        nav={[
          ['#overview', 'Overview', <GridIcon />],
          ['#products', 'My products', <PackageIcon />],
          ['#activity', 'Activity', <ActivityIcon />],
          ['/broker', 'View broker panel', <SearchIcon size={18} />]
        ]}
        user={{ initials: 'MS', name: 'My Store', role: 'Seller account' }}
        title="Seller workspace"
        actions={(
          <div className="topbar-actions">
            <AppLink className="btn-panel btn-panel-secondary" href="/">View website</AppLink>
            <button className="btn-panel btn-panel-primary" type="button" onClick={openAddProduct}>+ Add product</button>
          </div>
        )}
      >
        <section className="page-heading" id="overview">
          <div>
            <p className="eyebrow">Store overview</p>
            <h1 className="page-title">Manage what you sell.</h1>
            <p className="page-description">Publish products for brokers to discover, keep stock accurate, and follow every sale from one workspace.</p>
          </div>
          <button className="btn-panel btn-panel-primary" type="button" onClick={openAddProduct}>+ Add new product</button>
        </section>

        <section className="metrics-grid" aria-label="Store metrics">
          <Metric icon="▦" value={myProducts.length} label="Published products" />
          <Metric icon="◫" value={myProducts.reduce((sum, product) => sum + product.stock, 0)} label="Units in inventory" />
          <Metric icon="!" value={myProducts.filter((product) => product.stock > 0 && product.stock <= 10).length} label="Low-stock products" />
          <Metric icon="₹" value={formatCurrency(mySales.reduce((sum, sale) => sum + sale.total, 0))} label="Sales value generated" />
        </section>

        <section className="dashboard-grid">
          <article className="panel-card" id="products">
            <header className="panel-card-header">
              <div><h2 className="panel-card-title">My product listings</h2><p className="panel-card-subtitle">Products visible to the broker network</p></div>
              <div className="toolbar">
                <label className="search-wrap">
                  <SearchIcon size={15} />
                  <input className="search-input" value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Search products" aria-label="Search my products" />
                </label>
              </div>
            </header>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {visibleProducts.length ? visibleProducts.map((product) => (
                    <tr key={product.id}>
                      <td><ProductCell product={product} /></td>
                      <td>{product.category}</td>
                      <td>{formatCurrency(product.price)}</td>
                      <td>{product.stock}</td>
                      <td><StockBadge stock={product.stock} /></td>
                      <td>
                        <div className="table-actions">
                          <button className="icon-button" type="button" aria-label={`Edit ${product.name}`} onClick={() => { setEditing(product); setModalOpen(true); }}><EditIcon /></button>
                          <button className="icon-button delete" type="button" aria-label={`Delete ${product.name}`} onClick={() => deleteProduct(product)}><TrashIcon /></button>
                        </div>
                      </td>
                    </tr>
                  )) : <EmptyRow colSpan={6} title="No products found" text="Add your first product or adjust your search." />}
                </tbody>
              </table>
            </div>
          </article>

          <aside className="panel-card" id="activity">
            <header className="panel-card-header"><div><h2 className="panel-card-title">Recent activity</h2><p className="panel-card-subtitle">Updates affecting your store</p></div></header>
            <div className="panel-card-body"><ActivityList items={activity} /></div>
          </aside>
        </section>
      </DashboardShell>
      <ProductModal open={modalOpen} product={editing} onClose={() => { setModalOpen(false); setEditing(null); }} onSave={saveProduct} showToast={store.showToast} />
      <ToastRegion toasts={store.toasts} />
    </>
  );
}

function BrokerPanel() {
  const store = useDigitQuoStore();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [saleProduct, setSaleProduct] = useState(null);
  const available = store.products.filter((product) => product.stock > 0);
  const categories = [...new Set(available.map((product) => product.category))].sort();
  const sales = store.sales.filter((sale) => sale.broker === CURRENT_BROKER);
  const visible = available.filter((product) => {
    const matchesSearch = `${product.name} ${product.seller} ${product.category}`.toLowerCase().includes(search.trim().toLowerCase());
    const matchesCategory = category === 'all' || product.category === category;
    return matchesSearch && matchesCategory;
  });

  useEffect(() => {
    document.title = 'Broker Panel - DigitQuo';
  }, []);

  const recordSale = ({ productId, customer, quantity }) => {
    const index = store.products.findIndex((product) => product.id === productId);
    const product = store.products[index];
    if (!product || !customer || quantity < 1 || quantity > product.stock) {
      store.showToast('Enter a customer and a valid quantity.', 'error');
      return;
    }
    const sale = createSale(product, customer, quantity, CURRENT_BROKER);
    const nextProducts = [...store.products];
    nextProducts[index] = { ...product, stock: product.stock - quantity };
    store.setProducts(nextProducts);
    store.setSales([sale, ...store.sales]);
    store.addActivity('sale', `${CURRENT_BROKER} sold ${quantity} × ${product.name} to ${customer} for ${formatCurrency(sale.total)}.`);
    setSaleProduct(null);
    store.showToast(`Sale recorded: ${formatCurrency(sale.total)}.`, 'success');
  };

  return (
    <>
      <DashboardShell
        label="Broker panel"
        nav={[
          ['#overview', 'Overview', <GridIcon />],
          ['#catalog', 'Product catalog', <SearchIcon size={18} />],
          ['#sales', 'My sales', <SaleIcon />],
          ['/shopkeeper', 'View seller panel', <HomeIcon size={18} />]
        ]}
        user={{ initials: 'PB', name: 'Partner Broker', role: 'Broker account' }}
        title="Broker workspace"
        actions={<AppLink className="btn-panel btn-panel-secondary" href="/">View website</AppLink>}
      >
        <section className="page-heading" id="overview">
          <div><p className="eyebrow">Broker overview</p><h1 className="page-title">Find products. Make the sale.</h1><p className="page-description">Browse live inventory from every seller, choose the right products for your customers, and record each completed sale.</p></div>
          <a className="btn-panel btn-panel-primary" href="#catalog">Browse all products</a>
        </section>

        <section className="metrics-grid" aria-label="Broker metrics">
          <Metric icon="▦" value={available.length} label="Products available" />
          <Metric icon="⌂" value={new Set(available.map((product) => product.seller)).size} label="Active sellers" />
          <Metric icon="◈" value={new Set(available.map((product) => product.category)).size} label="Product categories" />
          <Metric icon="₹" value={formatCurrency(sales.reduce((sum, sale) => sum + sale.total, 0))} label="My recorded sales" />
        </section>

        <section className="panel-card" id="catalog">
          <header className="panel-card-header">
            <div><h2 className="panel-card-title">Seller product catalog</h2><p className="panel-card-subtitle">Live products available for customer sales</p></div>
            <div className="toolbar">
              <label className="search-wrap"><SearchIcon size={15} /><input className="search-input" value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Search catalog" aria-label="Search product catalog" /></label>
              <select className="filter-select" value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter products by category">
                <option value="all">All categories</option>
                {categories.map((categoryName) => <option value={categoryName} key={categoryName}>{categoryName}</option>)}
              </select>
            </div>
          </header>
          <div className="panel-card-body">
            <div className="catalog-grid">
              {visible.length ? visible.map((product) => (
                <article className="catalog-card" key={product.id}>
                  <div className="catalog-visual"><ProductImage product={product} /></div>
                  <div className="catalog-body">
                    <p className="catalog-seller">{product.seller}</p>
                    <h3 className="catalog-name">{product.name}</h3>
                    <div className="catalog-meta">
                      <span className="catalog-price">{formatCurrency(product.price)}</span>
                      <span className="catalog-stock">{product.stock} available</span>
                    </div>
                    <button className="btn-panel btn-panel-primary" type="button" onClick={() => setSaleProduct(product)}>Record customer sale</button>
                  </div>
                </article>
              )) : <div className="empty-state"><strong>No matching products</strong>Try another search or category.</div>}
            </div>
          </div>
        </section>

        <section className="panel-card" id="sales">
          <header className="panel-card-header"><div><h2 className="panel-card-title">My recent customer sales</h2><p className="panel-card-subtitle">Transactions recorded from this broker account</p></div></header>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Product</th><th>Customer</th><th>Quantity</th><th>Total</th><th>Date</th></tr></thead>
              <tbody>
                {sales.length ? sales.slice(0, 8).map((sale) => (
                  <tr key={sale.id}>
                    <td><span className="cell-title">{sale.productName}</span><br /><span className="cell-meta">{sale.seller}</span></td>
                    <td>{sale.customer}</td>
                    <td>{sale.quantity}</td>
                    <td>{formatCurrency(sale.total)}</td>
                    <td>{formatDate(sale.createdAt)}</td>
                  </tr>
                )) : <EmptyRow colSpan={5} title="No sales recorded yet" text="Choose a product above to record your first sale." />}
              </tbody>
            </table>
          </div>
        </section>
      </DashboardShell>
      <SaleModal product={saleProduct} onClose={() => setSaleProduct(null)} onSave={recordSale} />
      <ToastRegion toasts={store.toasts} />
    </>
  );
}

function AdminPanel() {
  const store = useDigitQuoStore();
  const sellers = new Set(store.products.map((product) => product.seller));
  const brokers = new Set(store.sales.map((sale) => sale.broker));

  useEffect(() => {
    document.title = 'Owner Admin Panel - DigitQuo';
  }, []);

  const resetData = () => {
    if (!window.confirm('Reset products, sales, and activity to the original demo data?')) return;
    store.resetDemoData();
    store.showToast('Demo data restored.', 'success');
  };

  return (
    <>
      <DashboardShell
        label="Private owner panel"
        nav={[
          ['#overview', 'Overview', <GridIcon />],
          ['#activity', 'All activity', <ActivityIcon />],
          ['#products', 'All products', <PackageIcon />],
          ['#transactions', 'Transactions', <SaleIcon />],
          ['/', 'Back to website', <BackIcon />]
        ]}
        user={{ initials: 'OA', name: 'Owner Admin', role: 'Full platform access' }}
        title="Owner administration"
        actions={<button className="btn-panel btn-panel-secondary" type="button" onClick={resetData}>Reset demo data</button>}
      >
        <section className="page-heading" id="overview">
          <div><p className="eyebrow">Platform command centre</p><h1 className="page-title">Every activity, in one view.</h1><p className="page-description">Monitor seller listings, broker transactions, inventory movement, and the complete platform activity trail.</p></div>
        </section>

        <div className="admin-notice">
          <ShieldIcon size={19} />
          <div><strong>Owner-only workspace</strong>This page is excluded from search indexing and is not linked from the public website. Production access must be protected with server-side authentication.</div>
        </div>

        <section className="metrics-grid" aria-label="Platform metrics">
          <Metric icon="◎" value={sellers.size + brokers.size} label="Active platform accounts" />
          <Metric icon="▦" value={store.products.length} label="Product listings" />
          <Metric icon="◫" value={store.sales.reduce((sum, sale) => sum + sale.quantity, 0)} label="Units sold" />
          <Metric icon="₹" value={formatCurrency(store.sales.reduce((sum, sale) => sum + sale.total, 0))} label="Gross sales volume" />
        </section>

        <section className="dashboard-grid">
          <article className="panel-card" id="products">
            <header className="panel-card-header"><div><h2 className="panel-card-title">All marketplace products</h2><p className="panel-card-subtitle">Inventory published by every seller</p></div></header>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Product</th><th>Seller</th><th>Price</th><th>Stock</th><th>Status</th><th>Added</th></tr></thead>
                <tbody>
                  {store.products.map((product) => (
                    <tr key={product.id}>
                      <td><ProductCell product={product} /></td>
                      <td>{product.seller}</td>
                      <td>{formatCurrency(product.price)}</td>
                      <td>{product.stock}</td>
                      <td><StockBadge stock={product.stock} /></td>
                      <td>{formatDate(product.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
          <aside className="panel-card" id="activity">
            <header className="panel-card-header"><div><h2 className="panel-card-title">Live activity trail</h2><p className="panel-card-subtitle">Product and transaction events</p></div></header>
            <div className="panel-card-body"><ActivityList items={store.activity.slice(0, 12)} /></div>
          </aside>
        </section>

        <section className="panel-card" id="transactions">
          <header className="panel-card-header"><div><h2 className="panel-card-title">All broker transactions</h2><p className="panel-card-subtitle">Complete customer sales visibility</p></div></header>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Product</th><th>Broker</th><th>Customer</th><th>Quantity</th><th>Value</th><th>Date</th></tr></thead>
              <tbody>
                {store.sales.length ? store.sales.map((sale) => (
                  <tr key={sale.id}>
                    <td><span className="cell-title">{sale.productName}</span><br /><span className="cell-meta">{sale.seller}</span></td>
                    <td>{sale.broker}</td>
                    <td>{sale.customer}</td>
                    <td>{sale.quantity}</td>
                    <td>{formatCurrency(sale.total)}</td>
                    <td>{formatDate(sale.createdAt)}</td>
                  </tr>
                )) : <EmptyRow colSpan={6} title="No transaction activity" text="Sales recorded by brokers will appear here." />}
              </tbody>
            </table>
          </div>
        </section>
      </DashboardShell>
      <ToastRegion toasts={store.toasts} />
    </>
  );
}

function DashboardShell({ label, nav, user, title, actions, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const dateLabel = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  useEffect(() => {
    document.body.classList.toggle('sidebar-open', sidebarOpen);
    return () => document.body.classList.remove('sidebar-open');
  }, [sidebarOpen]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setSidebarOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="dashboard-shell">
      <aside className="sidebar" aria-label={`${label} navigation`}>
        <AppLink className="panel-brand" href="/"><span className="panel-brand-mark"><LogoIcon size={19} /></span>DigitQuo</AppLink>
        <p className="panel-label">{label}</p>
        <nav className="sidebar-nav">
          {nav.map(([href, navLabel, icon], index) => (
            <AppLink className={`sidebar-link${index === 0 ? ' active' : ''}`} href={href} key={navLabel} onClick={() => setSidebarOpen(false)}>{icon}{navLabel}</AppLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-chip">
            <span className="user-avatar">{user.initials}</span>
            <div><p className="user-name">{user.name}</p><p className="user-role">{user.role}</p></div>
          </div>
        </div>
      </aside>
      <div className="sidebar-scrim" onClick={() => setSidebarOpen(false)} />

      <main className="main-panel">
        <header className="topbar">
          <div className="topbar-actions">
            <button className="mobile-menu-button" type="button" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}><MenuIcon /></button>
            <div><p className="topbar-title">{title}</p><p className="topbar-meta">{dateLabel}</p></div>
          </div>
          {actions}
        </header>
        <div className="dashboard-content">{children}</div>
      </main>
    </div>
  );
}

function useDigitQuoStore() {
  const [products, setProductsState] = useState(() => {
    seedDemoData();
    return readStore(DQ_KEYS.products);
  });
  const [sales, setSalesState] = useState(() => readStore(DQ_KEYS.sales));
  const [activity, setActivityState] = useState(() => readStore(DQ_KEYS.activity));
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = '') => {
    const toast = { id: `toast_${Date.now()}_${Math.random()}`, message, type };
    setToasts((items) => [...items, toast]);
    setTimeout(() => setToasts((items) => items.filter((item) => item.id !== toast.id)), 3600);
  };

  const setProducts = (items) => {
    writeStore(DQ_KEYS.products, items);
    setProductsState(items);
  };

  const setSales = (items) => {
    writeStore(DQ_KEYS.sales, items);
    setSalesState(items);
  };

  const setActivity = (items) => {
    writeStore(DQ_KEYS.activity, items);
    setActivityState(items);
  };

  const addActivity = (type, message) => {
    const next = [createActivity(type, message), ...readStore(DQ_KEYS.activity)].slice(0, 100);
    writeStore(DQ_KEYS.activity, next);
    setActivityState(next);
  };

  const resetDemoData = () => {
    Object.values(DQ_KEYS).forEach((key) => localStorage.removeItem(key));
    seedDemoData();
    setProductsState(readStore(DQ_KEYS.products));
    setSalesState(readStore(DQ_KEYS.sales));
    setActivityState(readStore(DQ_KEYS.activity));
  };

  return { products, sales, activity, toasts, setProducts, setSales, setActivity, addActivity, resetDemoData, showToast };
}

function ProductModal({ open, product, onClose, onSave, showToast }) {
  const initial = useMemo(() => product || { name: '', category: '', price: '', stock: '', image: '', description: '' }, [product]);
  const [values, setValues] = useState(initial);

  useEffect(() => {
    setValues(initial);
  }, [initial, open]);

  useModal(open);

  if (!open) return null;

  const update = (key, value) => setValues((current) => ({ ...current, [key]: value }));
  const submit = (event) => {
    event.preventDefault();
    const cleaned = {
      name: String(values.name || '').trim(),
      category: String(values.category || '').trim(),
      price: Number(values.price),
      stock: Number(values.stock),
      image: safeImageUrl(String(values.image || '').trim()),
      description: String(values.description || '').trim()
    };
    if (!cleaned.name || !cleaned.category || cleaned.price <= 0 || cleaned.stock < 0) {
      showToast('Please complete all required product fields.', 'error');
      return;
    }
    onSave(cleaned);
  };

  return (
    <div className="modal-backdrop open" aria-hidden="false" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <form className="modal" onSubmit={submit}>
        <header className="modal-header"><h2 className="modal-title">{product ? 'Edit product' : 'Add a new product'}</h2><button className="modal-close" type="button" onClick={onClose} aria-label="Close">×</button></header>
        <div className="modal-body">
          <div className="form-grid">
            <label className="form-group full"><span className="form-label">Product name *</span><input className="form-control" value={values.name || ''} onChange={(event) => update('name', event.target.value)} required maxLength="80" placeholder="e.g. Premium cotton shirt" /></label>
            <label className="form-group"><span className="form-label">Category *</span><select className="form-control" value={values.category || ''} onChange={(event) => update('category', event.target.value)} required><option value="">Choose category</option><option>Apparel</option><option>Accessories</option><option>Electronics</option><option>Food</option><option>Home &amp; Living</option><option>Other</option></select></label>
            <label className="form-group"><span className="form-label">Price per unit (₹) *</span><input className="form-control" value={values.price || ''} onChange={(event) => update('price', event.target.value)} type="number" required min="1" step="1" placeholder="999" /></label>
            <label className="form-group"><span className="form-label">Available stock *</span><input className="form-control" value={values.stock ?? ''} onChange={(event) => update('stock', event.target.value)} type="number" required min="0" step="1" placeholder="25" /></label>
            <label className="form-group"><span className="form-label">Image URL</span><input className="form-control" value={values.image || ''} onChange={(event) => update('image', event.target.value)} type="url" placeholder="https://..." /><span className="form-help">Use a direct HTTPS image link.</span></label>
            <label className="form-group full"><span className="form-label">Description</span><textarea className="form-control" value={values.description || ''} onChange={(event) => update('description', event.target.value)} maxLength="300" placeholder="Add useful product details for brokers" /></label>
          </div>
        </div>
        <footer className="modal-footer"><button className="btn-panel btn-panel-secondary" type="button" onClick={onClose}>Cancel</button><button className="btn-panel btn-panel-primary" type="submit">{product ? 'Save changes' : 'Publish product'}</button></footer>
      </form>
    </div>
  );
}

function SaleModal({ product, onClose, onSave }) {
  const [quantity, setQuantity] = useState(1);
  const [customer, setCustomer] = useState('');
  useModal(Boolean(product));

  useEffect(() => {
    setQuantity(1);
    setCustomer('');
  }, [product]);

  if (!product) return null;

  return (
    <div className="modal-backdrop open" aria-hidden="false" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <form className="modal" onSubmit={(event) => { event.preventDefault(); onSave({ productId: product.id, customer: customer.trim(), quantity: Number(quantity) }); }}>
        <header className="modal-header"><h2 className="modal-title">Record a customer sale</h2><button className="modal-close" type="button" onClick={onClose} aria-label="Close">×</button></header>
        <div className="modal-body">
          <div className="form-grid">
            <label className="form-group full"><span className="form-label">Product</span><input className="form-control" value={product.name} readOnly /></label>
            <label className="form-group"><span className="form-label">Seller</span><input className="form-control" value={product.seller} readOnly /></label>
            <label className="form-group"><span className="form-label">Quantity sold *</span><input className="form-control" value={quantity} onChange={(event) => setQuantity(event.target.value)} type="number" required min="1" max={product.stock} step="1" /><span className="form-help">{product.stock} units available at {formatCurrency(product.price)} each.</span></label>
            <label className="form-group full"><span className="form-label">Customer or business name *</span><input className="form-control" value={customer} onChange={(event) => setCustomer(event.target.value)} required maxLength="80" placeholder="Who did you sell this to?" /></label>
          </div>
        </div>
        <footer className="modal-footer"><button className="btn-panel btn-panel-secondary" type="button" onClick={onClose}>Cancel</button><button className="btn-panel btn-panel-primary" type="submit">Confirm sale</button></footer>
      </form>
    </div>
  );
}

function useModal(open) {
  useEffect(() => {
    if (!open) return undefined;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event) => {
      if (event.key === 'Escape') document.querySelector('.modal-close')?.click();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);
}

function Metric({ icon, value, label }) {
  return <article className="metric-card"><span className="metric-icon">{icon}</span><strong className="metric-value">{value}</strong><span className="metric-label">{label}</span></article>;
}

function ProductCell({ product }) {
  return (
    <div className="product-cell">
      <span className="product-thumb"><ProductImage product={product} /></span>
      <div><p className="cell-title">{product.name}</p><p className="cell-meta">{product.id.slice(-8).toUpperCase()}</p></div>
    </div>
  );
}

function ProductImage({ product }) {
  const image = safeImageUrl(product.image || '');
  return image ? <img src={image} alt="" loading="lazy" /> : product.name.slice(0, 2).toUpperCase();
}

function StockBadge({ stock }) {
  if (stock <= 0) return <span className="status-badge status-out">Out of stock</span>;
  if (stock <= 10) return <span className="status-badge status-low">Low stock</span>;
  return <span className="status-badge status-active">Active</span>;
}

function ActivityList({ items }) {
  if (!items.length) return <div className="empty-state"><strong>No activity yet</strong>New actions will appear here.</div>;
  return (
    <div className="activity-list">
      {items.map((item) => (
        <div className="activity-item" key={item.id}>
          <span className="activity-icon">{item.type === 'sale' ? <SaleIcon size={17} /> : item.type === 'product' ? <PackageIcon size={17} /> : <ActivityIcon size={16} />}</span>
          <div>
            <p className="activity-message">{item.message}</p>
            <p className="activity-time">{relativeTime(item.createdAt)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyRow({ colSpan, title, text }) {
  return <tr><td colSpan={colSpan}><div className="empty-state"><strong>{title}</strong>{text}</div></td></tr>;
}

function ToastRegion({ toasts }) {
  return <div className="toast-region" aria-live="polite">{toasts.map((toast) => <div className={`toast ${toast.type}`} key={toast.id}>{toast.message}</div>)}</div>;
}

function readStore(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

function writeStore(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function seedDemoData() {
  if (!localStorage.getItem(DQ_KEYS.products)) {
    writeStore(DQ_KEYS.products, [
      createProduct('Premium Cotton Shirts', 'Apparel', 899, 42, 'My Store', 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=700&q=80'),
      createProduct('Classic Leather Wallet', 'Accessories', 649, 18, 'My Store', 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=700&q=80'),
      createProduct('Ceramic Dinner Set', 'Home & Living', 1499, 25, 'Sharma Homeware', 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=700&q=80'),
      createProduct('Wireless Earbuds', 'Electronics', 1299, 31, 'Tech Corner', 'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?auto=format&fit=crop&w=700&q=80'),
      createProduct('Handcrafted Tote Bag', 'Accessories', 749, 12, 'Craft & Co.', 'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=700&q=80'),
      createProduct('Organic Spice Box', 'Food', 499, 55, 'Rajasthan Foods', 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=700&q=80')
    ]);
  }

  if (!localStorage.getItem(DQ_KEYS.sales)) {
    const products = readStore(DQ_KEYS.products);
    writeStore(DQ_KEYS.sales, [
      createSale(products[0], 'Anita Retail', 3, 'Market Connect'),
      createSale(products[2], 'Home Style Store', 2, 'Northside Broker')
    ]);
  }

  if (!localStorage.getItem(DQ_KEYS.activity)) {
    writeStore(DQ_KEYS.activity, [
      createActivity('sale', 'Market Connect recorded a sale of 3 × Premium Cotton Shirts.'),
      createActivity('product', 'My Store published Classic Leather Wallet.'),
      createActivity('product', 'Tech Corner updated stock for Wireless Earbuds.'),
      createActivity('sale', 'Northside Broker recorded a ₹2,998 customer sale.')
    ]);
  }
}

function createProduct(name, category, price, stock, seller, image = '', description = '') {
  return {
    id: `prd_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    name,
    category,
    price: Number(price),
    stock: Number(stock),
    seller,
    image,
    description,
    createdAt: new Date().toISOString()
  };
}

function createSale(product, customer, quantity, broker) {
  return {
    id: `sale_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    productId: product.id,
    productName: product.name,
    seller: product.seller,
    customer,
    quantity: Number(quantity),
    unitPrice: Number(product.price),
    total: Number(product.price) * Number(quantity),
    broker,
    createdAt: new Date().toISOString()
  };
}

function createActivity(type, message) {
  return { id: `act_${Date.now()}_${Math.random().toString(16).slice(2)}`, type, message, createdAt: new Date().toISOString() };
}

function safeImageUrl(url) {
  return /^https?:\/\//i.test(url) ? url : '';
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value) || 0);
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

function relativeTime(value) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(diff / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return formatDate(value);
}

function formatNumber(num) {
  return num >= 1000 ? num.toLocaleString() : num.toString();
}

function Svg({ size = 24, children, ...props }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>{children}</svg>;
}

function LogoMark() {
  return <span className="logo-mark"><LogoIcon size={18} strokeWidth="2.5" /></span>;
}

function LogoIcon({ size = 18, strokeWidth = '2.4' }) {
  return <Svg size={size} strokeWidth={strokeWidth}><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" /><line x1="12" y1="22" x2="12" y2="15.5" /><polyline points="22 8.5 12 15.5 2 8.5" /></Svg>;
}

function ArrowRightIcon({ size = 16 }) {
  return <Svg size={size} strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></Svg>;
}

function PlayIcon() {
  return <Svg size={16} strokeWidth="2"><circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" /></Svg>;
}

function StarIcon() {
  return <Svg size={14} strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></Svg>;
}

function LayersIcon() {
  return <Svg><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></Svg>;
}

function SearchIcon({ size = 24 }) {
  return <Svg size={size}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></Svg>;
}

function ShieldIcon({ size = 24 }) {
  return <Svg size={size}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></Svg>;
}

function ChartIcon() {
  return <Svg><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></Svg>;
}

function ClockIcon() {
  return <Svg size={14} strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></Svg>;
}

function UsersIcon({ size = 14 }) {
  return <Svg size={size} strokeWidth={size === 14 ? '2' : '1.5'}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></Svg>;
}

function HomeIcon({ size = 28 }) {
  return <Svg size={size} strokeWidth={size === 28 ? '1.5' : '1.8'}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></Svg>;
}

function CheckIcon() {
  return <Svg size={14} strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></Svg>;
}

function MessageIcon() {
  return <Svg size={14} strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></Svg>;
}

function TwitterIcon() {
  return <Svg size={18} strokeWidth="1.5"><path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" /></Svg>;
}

function LinkedInIcon() {
  return <Svg size={18} strokeWidth="1.5"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></Svg>;
}

function InstagramIcon() {
  return <Svg size={18} strokeWidth="1.5"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></Svg>;
}

function GridIcon() {
  return <Svg size={18}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></Svg>;
}

function PackageIcon({ size = 18 }) {
  return <Svg size={size}><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></Svg>;
}

function ActivityIcon({ size = 18 }) {
  return <Svg size={size}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></Svg>;
}

function SaleIcon({ size = 18 }) {
  return <Svg size={size}><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7H14a3.5 3.5 0 010 7H6" /></Svg>;
}

function EditIcon() {
  return <Svg size={15} strokeWidth="2"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 013 3L8 18l-4 1 1-4z" /></Svg>;
}

function TrashIcon() {
  return <Svg size={15} strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6m3 0V4h8v2" /></Svg>;
}

function MenuIcon() {
  return <Svg size={20} strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></Svg>;
}

function BackIcon() {
  return <Svg size={18}><path d="M19 12H5" /><polyline points="12 19 5 12 12 5" /></Svg>;
}
