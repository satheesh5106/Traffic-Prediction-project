import { Header } from '@/lib/components/layout/Header';
import { Hero } from '@/lib/components/sections/Hero';
import { Features } from '@/lib/components/sections/Features';
import { HowItWorks } from '@/lib/components/sections/HowItWorks';
import { Metrics } from '@/lib/components/sections/Metrics';
import { Testimonials } from '@/lib/components/sections/Testimonials';
import { Team } from '@/lib/components/sections/Team';
import { Footer } from '@/lib/components/sections/Footer';

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <main className="relative">
      <Header />
      <div className="pt-16">
        <Hero />
        <section id="features">
          <Features />
        </section>
        <section id="how-it-works">
          <HowItWorks />
        </section>
        <section id="metrics">
          <Metrics />
        </section>
        <Testimonials />
        <section id="team">
          <Team />
        </section>
        <Footer />
      </div>
    </main>
  );
}