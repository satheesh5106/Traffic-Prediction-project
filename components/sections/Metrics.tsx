'use client';
import { motion } from 'framer-motion';
import { useCounterAnimation, useScrollAnimation } from '@/hooks/useScrollAnimation';
import { TrendingUp, Users, Clock, Shield } from 'lucide-react';

const metrics = [
  {
    icon: TrendingUp,
    value: 'Pending',
    suffix: '',
    title: 'Prediction Accuracy',
    description: 'Our AI models achieve industry-leading accuracy rates',
    color: 'from-blue-500 to-blue-600'
  },
  {
    icon: Users,
    value: 'Will be decided',
    suffix: '',
    title: 'Active Users',
    description: 'Traffic managers trust our platform worldwide',
    color: 'from-emerald-500 to-emerald-600'
  },
  {
    icon: Clock,
    value: 'Pending',
    suffix: '',
    title: 'Time Reduction',
    description: 'Average commute time improvement for users',
    color: 'from-purple-500 to-purple-600'
  },
  {
    icon: Shield,
    value: 'Will be decided',
    suffix: '',
    title: 'Incident Prevention',
    description: 'Incidents prevented through early prediction',
    color: 'from-orange-500 to-orange-600'
  }
];

const MetricCard = ({ metric, index }: { metric: typeof metrics[0], index: number }) => {

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: index * 0.1 }}
      viewport={{ once: true }}
      whileHover={{ scale: 1.02 }}
      className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 relative overflow-hidden group"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative z-10">
        <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-r ${metric.color} mb-6 shadow-lg`}>
          <metric.icon className="h-8 w-8 text-white" />
        </div>
        
        <div className="mb-4">
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-2xl md:text-3xl font-bold text-gray-900">
              {metric.value}
            </span>
            <span className="text-2xl font-bold text-gray-600">
              {metric.suffix}
            </span>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">
            {metric.title}
          </h3>
        </div>
        
        <p className="text-gray-600 leading-relaxed">
          {metric.description}
        </p>

        <div className="mt-6">
          <div className={`h-1 w-0 group-hover:w-full bg-gradient-to-r ${metric.color} transition-all duration-700 rounded-full`} />
        </div>
      </div>
    </motion.div>
  );
};

export const Metrics = () => {
  const sectionRef = useScrollAnimation();

  return (
    <section ref={sectionRef} className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Proven{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Results & Impact
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Our platform delivers measurable improvements in traffic management 
            and safety across cities worldwide.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {metrics.map((metric, index) => (
            <MetricCard key={index} metric={metric} index={index} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-4">
              Real-Time Data Processing
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="text-3xl font-bold mb-2">Pending</div>
                <div className="text-blue-100">Data Points/Second</div>
              </div>
              <div>
                <div className="text-3xl font-bold mb-2">Will be decided</div>
                <div className="text-blue-100">Response Time</div>
              </div>
              <div>
                <div className="text-3xl font-bold mb-2">Pending</div>
                <div className="text-blue-100">Monitoring</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};