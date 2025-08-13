import { Header } from '@/components/layout/Header';
import { Hero } from '@/components/sections/Hero';
import { Features } from '@/components/sections/Features';
import { HowItWorks } from '@/components/sections/HowItWorks';
import { Metrics } from '@/components/sections/Metrics';
import { Testimonials } from '@/components/sections/Testimonials';
import { Team } from '@/components/sections/Team';
import { Footer } from '@/components/sections/Footer';

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