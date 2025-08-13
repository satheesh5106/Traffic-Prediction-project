'use client';
import { motion } from 'framer-motion';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { Linkedin, Twitter, Mail } from 'lucide-react';

const team = [
  {
    name: 'G.Sandeep',
    bio: 'Register Number: 9922005109. Student at Kalasalingam Academy of Research and Education. Specializing in AI and machine learning applications for traffic management systems.',
    image: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
    linkedin: '#',
    twitter: '#',
    email: 'traffic.ai.2025@gmail.com'
  },
  {
    name: 'G.Satheesh',
    bio: 'Register Number: 9922005106. Student at Kalasalingam Academy of Research and Education. Expert in React and Next.js development for intelligent traffic solutions.',
    image: 'https://images.pexels.com/photos/3760767/pexels-photo-3760767.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
    linkedin: '#',
    twitter: '#',
    email: 'traffic.ai.2025@gmail.com'
  },
  {
    name: 'Shaik Ubaid',
    bio: 'Register Number: 9922005151. Student at Kalasalingam Academy of Research and Education. Focused on backend systems and database optimization for traffic data processing.',
    image: 'https://images.pexels.com/photos/1065084/pexels-photo-1065084.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
    linkedin: '#',
    twitter: '#',
    email: 'traffic.ai.2025@gmail.com'
  }
];

const TeamCard = ({ member, index }: { member: typeof team[0], index: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: index * 0.1 }}
      viewport={{ once: true }}
      whileHover={{ y: -10 }}
      className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 relative overflow-hidden group"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative z-10">
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-400 to-purple-400 mx-auto flex items-center justify-center shadow-lg group-hover:shadow-2xl transition-shadow duration-300">
            <span className="text-white font-bold text-xl">{member.name.split(' ').map(n => n[0]).join('')}</span>
          </div>
        </div>
        
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {member.name}
          </h3>
          {/* <p className="text-blue-600 font-semibold mb-4">
            {member.role}
          </p> */}
          <p className="text-gray-600 leading-relaxed text-sm">
            {member.bio}
          </p>
        </div>
        
        <div className="flex justify-center gap-4">
          <motion.a
            href={member.linkedin}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors duration-200"
          >
            <Linkedin className="h-4 w-4" />
          </motion.a>
          <motion.a
            href={member.twitter}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors duration-200"
          >
            <Twitter className="h-4 w-4" />
          </motion.a>
          <motion.a
            href={`mailto:${member.email}`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors duration-200"
          >
            <Mail className="h-4 w-4" />
          </motion.a>
        </div>
      </div>
    </motion.div>
  );
};

export const Team = () => {
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
            Meet Our{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Development Team
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Students from Kalasalingam Academy of Research and Education 
            developing innovative traffic management solutions using AI and modern web technologies.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {team.map((member, index) => (
            <TeamCard key={index} member={member} index={index} />
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
              Kalasalingam Academy of Research and Education
            </h3>
            <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
              A premier institution fostering innovation in AI and technology. 
              Our students are developing cutting-edge solutions for real-world traffic management challenges.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white text-blue-600 px-8 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-colors duration-200"
              onClick={() => window.open('https://www.kalasalingam.ac.in/', '_blank')}
            >
              Learn More About KARE
            </motion.button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};