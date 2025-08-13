'use client';
import { motion } from 'framer-motion';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { 
  Brain, 
  MapPin, 
  AlertTriangle, 
  BarChart3, 
  Clock, 
  Shield, 
  Zap, 
  Users 
} from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: 'Hybrid Weather–Hazard Fusion Model',
    description: 'Weather API + IMD integration for comprehensive environmental data analysis.',
    color: 'from-blue-500 to-blue-600'
  },
  {
    icon: MapPin,
    title: 'Custom Traffic-Aware Routing Engine',
    description: 'Shortest, safest, fastest routes optimized for real-time traffic conditions.',
    color: 'from-emerald-500 to-emerald-600'
  },
  {
    icon: AlertTriangle,
    title: 'AI-Powered Incident Prediction',
    description: 'GNN + Attention + multi-modal data for advanced incident forecasting.',
    color: 'from-orange-500 to-orange-600'
  },
  {
    icon: BarChart3,
    title: 'Spatiotemporal Traffic Prediction',
    description: 'GNN + LSTM for accurate traffic flow and congestion predictions.',
    color: 'from-purple-500 to-purple-600'
  },
  {
    icon: Clock,
    title: 'Interactive Map with Predictive Overlays',
    description: 'Traffic, incidents, weather, hazards visualization in real-time.',
    color: 'from-indigo-500 to-indigo-600'
  },
  {
    icon: Shield,
    title: 'Statistically Validated IMD Integration',
    description: 'Impact analysis on routing & predictions with validated meteorological data.',
    color: 'from-red-500 to-red-600'
  },
  {
    icon: Zap,
    title: 'Intelligent Event-Driven Notifications',
    description: 'Push alerts based on AI predictions and real-time analysis.',
    color: 'from-yellow-500 to-yellow-600'
  },
  {
    icon: Users,
    title: 'Real-Time Data Collection & Processing',
    description: 'Traffic, weather, IMD feeds processed in real-time for instant insights.',
    color: 'from-teal-500 to-teal-600'
  },
  {
    icon: Brain,
    title: 'User Authentication',
    description: 'Firebase OAuth + JWT for secure user access and session management.',
    color: 'from-pink-500 to-pink-600'
  },
  {
    icon: MapPin,
    title: 'Landing Page with High-End Animations',
    description: 'Framer Motion, GSAP, Lottie, Three.js for immersive user experience.',
    color: 'from-cyan-500 to-cyan-600'
  }
];

const flowSteps = [
  {
    title: 'User Access',
    description: 'User opens landing page → Views features & animations → Clicks "Sign In / Create Account"',
    color: 'from-blue-500 to-blue-600'
  },
  {
    title: 'Authentication Process',
    description: 'Firebase OAuth (Google / Email) → JWT session created → Access granted to dashboard',
    color: 'from-emerald-500 to-emerald-600'
  },
  {
    title: 'Data Gathering Layer',
    description: 'Fetch real-time traffic data, live weather data (Weather API), IMD hazard alerts, historical incident & traffic datasets',
    color: 'from-orange-500 to-orange-600'
  },
  {
    title: 'Data Processing & Fusion',
    description: 'Clean & normalize data, fuse weather, IMD, and traffic datasets into unified format',
    color: 'from-purple-500 to-purple-600'
  },
  {
    title: 'Prediction Models',
    description: 'Incident Prediction (GNN + Attention model), Traffic Prediction (GNN + LSTM spatiotemporal model)',
    color: 'from-indigo-500 to-indigo-600'
  },
  {
    title: 'Decision Engine',
    description: 'Generate optimal routes (fastest, safest, hazard-avoidance), evaluate IMD warnings impact on routing',
    color: 'from-red-500 to-red-600'
  },
  {
    title: 'Visualization Layer',
    description: 'Render interactive map (Three.js + R3F), display predictive overlays (traffic flow, incidents, weather, hazards)',
    color: 'from-yellow-500 to-yellow-600'
  },
  {
    title: 'Notification System',
    description: 'Trigger alerts for high-risk routes or incidents, push notifications to logged-in users',
    color: 'from-teal-500 to-teal-600'
  },
  {
    title: 'User Interaction',
    description: 'User views routes & predictions → Chooses route → Updates navigation in real time',
    color: 'from-pink-500 to-pink-600'
  },
  {
    title: 'System Feedback Loop',
    description: 'Collect user feedback & actual travel times, update and retrain models for higher accuracy',
    color: 'from-cyan-500 to-cyan-600'
  }
];

export const Features = () => {
  const sectionRef = useScrollAnimation();

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.6
      }
    }
  };

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
            Powerful Features for{' '}
            <span className="bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
              Smart Cities
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Our comprehensive platform combines cutting-edge AI technology with intuitive design 
            to deliver unprecedented insights into urban traffic patterns.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{ 
                scale: 1.05,
                transition: { duration: 0.2 }
              }}
              className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="relative z-10">
                <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-r ${feature.color} mb-6 shadow-lg`}>
                  <feature.icon className="h-8 w-8 text-white" />
                </div>
                
                <h3 className="text-xl font-semibold text-gray-900 mb-4 group-hover:text-gray-800 transition-colors">
                  {feature.title}
                </h3>
                
                <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors">
                  {feature.description}
                </p>

                <div className="mt-6">
                  <div className={`h-1 w-0 group-hover:w-full bg-gradient-to-r ${feature.color} transition-all duration-500 rounded-full`} />
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

      </div>
    </section>
  );
};