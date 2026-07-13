import { Footer } from './Footer';
import { Navbar } from './Navbar';

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <>
      <div className="bg-effects" aria-hidden="true">
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-grid" />
      </div>
      <Navbar />
      <main className="legal-page">
        <section className="container legal-page-inner">
          <p className="eyebrow">Legal</p>
          <h1 className="legal-title">{title}</h1>
          <p className="legal-updated">Last updated: {updated}</p>
          <div className="legal-content">{children}</div>
        </section>
      </main>
      <Footer />
    </>
  );
}
