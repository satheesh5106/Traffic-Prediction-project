'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { AuthModal } from '@/components/auth/AuthModal';
import { useAuth } from '@/hooks/useAuth';
import { Menu, X, Zap, User, LogOut } from 'lucide-react';

const navigation = [
  { name: 'Features', href: '#features' },
  { name: 'How it Works', href: '#how-it-works' },
  { name: 'Metrics', href: '#metrics' },
  { name: 'Team', href: '#team' }
];

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [isClient, setIsClient] = useState(false);
  const { user, logout } = useAuth();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleAuthClick = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-xl border-b border-gray-100 shadow-sm"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-3"
            >
              <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">TrafficAI</span>
            </motion.div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              {navigation.map((item) => (
                <motion.a
                  key={item.name}
                  href={item.href}
                  whileHover={{ y: -2 }}
                  className="text-gray-700 hover:text-blue-600 transition-colors duration-200 font-medium"
                >
                  {item.name}
                </motion.a>
              ))}
            </nav>

            {/* Desktop Auth Buttons */}
            <div className="hidden md:flex items-center gap-4">
              {isClient && user ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-600" />
                    <span className="text-sm text-gray-700">
                      {user.email?.split('@')[0]}
                    </span>
                  </div>
                  <Button
                    onClick={handleLogout}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </Button>
                </div>
              ) : isClient ? (
                <>
                  <Button
                    onClick={() => handleAuthClick('signin')}
                    variant="ghost"
                    className="text-gray-700 hover:text-gray-900"
                  >
                    Sign In
                  </Button>
                  <Button
                    onClick={() => handleAuthClick('signup')}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
                  >
                    Get Started
                  </Button>
                </>
              ) : null}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          <motion.div
            initial={false}
            animate={{ 
              height: isMenuOpen ? 'auto' : 0,
              opacity: isMenuOpen ? 1 : 0
            }}
            transition={{ duration: 0.3 }}
            className="md:hidden overflow-hidden bg-white border-t border-gray-100"
          >
            <div className="py-4 space-y-4">
              {navigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-4 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  {item.name}
                </a>
              ))}
              
              <div className="px-4 pt-4 border-t border-gray-100 space-y-3">
                {isClient && user ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-600" />
                      <span className="text-sm text-gray-700">
                        {user.email?.split('@')[0]}
                      </span>
                    </div>
                    <Button
                      onClick={handleLogout}
                      variant="outline"
                      size="sm"
                      className="w-full flex items-center gap-2"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </Button>
                  </div>
                ) : isClient ? (
                  <>
                    <Button
                      onClick={() => {
                        handleAuthClick('signin');
                        setIsMenuOpen(false);
                      }}
                      variant="outline"
                      className="w-full"
                    >
                      Sign In
                    </Button>
                    <Button
                      onClick={() => {
                        handleAuthClick('signup');
                        setIsMenuOpen(false);
                      }}
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                    >
                      Get Started
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          </motion.div>
        </div>
      </motion.header>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authMode}
      />
    </>
  );
};