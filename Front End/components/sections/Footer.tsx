'use client';
import { motion } from 'framer-motion';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Twitter, 
  Linkedin, 
  Github,
  Zap
} from 'lucide-react';

const footerLinks = {
  product: [
    { name: 'Features', href: '#features' },
    { name: 'How it Works', href: '#how-it-works' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'API Documentation', href: '#' }
  ],
  company: [
    { name: 'About Us', href: '#team' },
    { name: 'Careers', href: '#' },
    { name: 'Press', href: '#' },
    { name: 'Contact', href: '#contact' }
  ],
  resources: [
    { name: 'Blog', href: '#' },
    { name: 'Case Studies', href: '#' },
    { name: 'White Papers', href: '#' },
    { name: 'Help Center', href: '#' }
  ],
  legal: [
    { name: 'Privacy Policy', href: '#' },
    { name: 'Terms of Service', href: '#' },
    { name: 'Cookie Policy', href: '#' },
    { name: 'Data Protection', href: '#' }
  ]
};

const socialLinks = [
  { icon: Twitter, href: '#', label: 'Twitter' },
  { icon: Linkedin, href: '#', label: 'LinkedIn' },
  { icon: Github, href: '#', label: 'GitHub' }
];

export const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          {/* Brand Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="lg:col-span-1"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <span className="text-2xl font-bold">TrafficAI</span>
            </div>
            <p className="text-gray-300 mb-6 leading-relaxed">
              Revolutionizing urban mobility through AI-powered traffic prediction 
              and hazard detection systems.
            </p>
            
            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-gray-300">
                <Mail className="h-4 w-4" />
                <span>traffic.ai.2025@gmail.com</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <Phone className="h-4 w-4" />
                <span>+91 81063 89906</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <MapPin className="h-4 w-4" />
                <span>TamilNadu, India</span>
              </div>
            </div>
          </motion.div>

          {/* Links Sections */}
          {Object.entries(footerLinks).map(([category, links], index) => (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <h3 className="font-semibold text-white mb-4 capitalize">
                {category}
              </h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.name}>
                    <motion.a
                      href={link.href}
                      whileHover={{ x: 4 }}
                      className="text-gray-300 hover:text-white transition-colors duration-200 block"
                    >
                      {link.name}
                    </motion.a>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Newsletter Signup */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
          className="mt-16 pt-8 border-t border-gray-800"
        >
          <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-2xl p-8">
            <div className="max-w-2xl mx-auto text-center">
              <h3 className="text-2xl font-bold mb-4">Stay Updated</h3>
              <p className="text-gray-300 mb-6">
                Get the latest insights on traffic AI and smart city innovations.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
                >
                  Subscribe
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Bottom Section */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          viewport={{ once: true }}
          className="mt-12 pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-6"
        >
          <div className="text-gray-400 text-sm">
            © 2025 TrafficAI. All rights reserved.
          </div>
          
          <div className="flex gap-4">
            {socialLinks.map((social) => (
              <motion.a
                key={social.label}
                href={social.href}
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 bg-gray-800 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-all duration-200"
                aria-label={social.label}
              >
                <social.icon className="h-5 w-5" />
              </motion.a>
            ))}
          </div>
        </motion.div>
      </div>
    </footer>
  );
};