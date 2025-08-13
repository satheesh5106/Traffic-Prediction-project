'use client';
import { motion } from 'framer-motion';
import { Database, Cpu, AlertCircle, TrendingUp } from 'lucide-react';

const steps = [
  {
    id: 1,
    icon: Database,
    title: 'Data Collection',
    description: 'Gather real-time traffic data from multiple sources including sensors, cameras, and mobile devices.',
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700'
  },
  {
    id: 2,
    icon: Cpu,
    title: 'AI Analysis',
    description: 'Process data through advanced machine learning models to identify patterns and predict future scenarios.',
    color: 'from-emerald-500 to-emerald-600',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700'
  },
  {
    id: 3,
    icon: AlertCircle,
    title: 'Hazard Prediction',
    description: 'Identify potential incidents, hazards, and traffic bottlenecks before they impact commuters.',
    color: 'from-orange-500 to-orange-600',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700'
  },
  {
    id: 4,
    icon: TrendingUp,
    title: 'Optimization',
    description: 'Provide actionable insights and recommendations to optimize traffic flow and enhance safety.',
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700'
  }
];

export const HowItWorks = () => {

  return (
    <section className="py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            How Our{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              AI System Works
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Our four-step process transforms raw traffic data into actionable insights 
            that prevent incidents and optimize urban mobility.
          </p>
        </motion.div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className={`${step.bgColor} rounded-3xl p-8 shadow-xl relative overflow-hidden h-96`}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/20 to-transparent rounded-full -mr-16 -mt-16" />
              
              <div className="relative z-10 h-full flex flex-col">
                <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-r ${step.color} mb-6 shadow-lg w-fit`}>
                  <step.icon className="h-8 w-8 text-white" />
                </div>
                
                <div className="mb-4">
                  <div className="text-sm font-semibold text-gray-500 mb-2">
                    STEP {step.id}
                  </div>
                  <h3 className={`text-2xl font-bold ${step.textColor} mb-4`}>
                    {step.title}
                  </h3>
                </div>
                
                <p className="text-gray-700 leading-relaxed text-lg flex-grow">
                  {step.description}
                </p>

                <div className="mt-6">
                  <div className={`h-2 bg-gradient-to-r ${step.color} rounded-full w-full`} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Real-Time Processing
            </h3>
            <p className="text-gray-700 text-lg">
              Our system processes data efficiently, 
              delivering predictions and insights with optimal performance.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};