'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
// import { CityMap } from '@/components/3d/CityMap';
import { Shield, Zap, TrendingUp } from 'lucide-react';

export const Hero = () => {



  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* <CityMap /> */}
      
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="space-y-8">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight">
            Predict Traffic,{' '}
            <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              Prevent Incidents
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
            Harness the power of AI to predict traffic patterns, identify potential hazards, 
            and optimize urban mobility before problems occur.
          </p>

          <Link href="/auth">
            <Button className="mt-8 px-8 py-4 text-lg font-semibold rounded-full bg-blue-600 hover:bg-blue-700 transition-colors duration-300">
              Get started
            </Button>
          </Link>




        </div>


      </div>
    </section>
  );
};