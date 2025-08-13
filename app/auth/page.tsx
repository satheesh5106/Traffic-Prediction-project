'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { Mail, Lock, Chrome, Eye, EyeOff, ArrowRight, UserPlus, CheckCircle, AlertCircle, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SuccessAnimation, LoadingAnimation } from '@/components/animations/LottieAnimations';
import { useToast, ToastContainer } from '@/components/ui/toast';

export const dynamic = 'force-dynamic';

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

const signUpSchema = signInSchema.extend({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

type SignInForm = z.infer<typeof signInSchema>;
type SignUpForm = z.infer<typeof signUpSchema>;

// Particle component for background animation
const Particle = ({ delay }: { delay: number }) => {
  const [style, setStyle] = useState({});

  useEffect(() => {
    setStyle({
      left: `${Math.random() * 100}%`,
      bottom: `${Math.random() * 100}%` // Also randomize bottom for more dynamic effect
    });
  }, []);

  return (
    <motion.div
      className="absolute w-2 h-2 bg-blue-400 rounded-full opacity-20"
      animate={{
        y: [-20, -100],
        x: [Math.random() * 20 - 10, Math.random() * 20 - 10],
        opacity: [0, 0.6, 0]
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        delay: delay,
        ease: "easeOut"
      }}
      style={style}
    />
  );
};

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const { signIn, signUp, signInWithGoogle, error: authError, user, loading: authLoading } = useAuth();
  const { toasts, showSuccess: showToastSuccess, showError, removeToast } = useToast();
  const router = useRouter();

  const schema = isSignUp ? signUpSchema : signInSchema;
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm({
    resolver: zodResolver(schema)
  });

  // Clear error function
  const clearError = () => {
    setLocalError(null);
  };

  // Redirect already authenticated users
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  // Handle success state
  useEffect(() => {
    if (user && !authLoading) {
      setShowSuccess(true);
      showToastSuccess('Authentication Successful!', 'Welcome to TrafficAI');
      setTimeout(() => {
        router.push('/dashboard');
        clearError();
      }, 1500);
    }
  }, [user, authLoading, router, showToastSuccess]);

  // Handle error state
  useEffect(() => {
    if (authError) {
      showError('Authentication Failed', authError.message);
      setLocalError(authError.message);
    }
  }, [authError, showError]);

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      if (isSignUp) {
        await signUp(data.email, data.password);
      } else {
        await signIn(data.email, data.password);
      }
      reset();
    } catch (error) {
      console.error('Authentication error:', error);
      // Error is already handled in the useEffect
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Google sign in error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.8,
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 100,
        damping: 15
      }
    }
  };

  const logoVariants = {
    hidden: { scale: 0, rotate: -180 },
    visible: {
      scale: 1,
      rotate: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 200,
        damping: 15,
        delay: 0.3
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Gradient Orbs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
            x: [0, 50, 0],
            y: [0, -30, 0]
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-30"
        />
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            rotate: [360, 180, 0],
            x: [0, -30, 0],
            y: [0, 50, 0]
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-purple-400 to-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-30"
        />
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            rotate: [0, -90, 0],
            x: [0, 20, 0],
            y: [0, -20, 0]
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-bl from-indigo-400 to-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20"
        />
        
        {/* Floating Particles */}
        {Array.from({ length: 15 }).map((_, i) => (
          <Particle key={i} delay={i * 0.2} />
        ))}
      </div>

      {/* Success Overlay */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="bg-white rounded-3xl p-8 shadow-2xl text-center"
            >
              <SuccessAnimation className="w-24 h-24 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Welcome!</h3>
              <p className="text-gray-600">Redirecting to dashboard...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-md"
      >
        <motion.div
          variants={itemVariants}
          className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20 relative overflow-hidden"
        >
          {/* Glassmorphism overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-white/5 rounded-3xl" />
          
          <div className="relative z-10">
            {/* Logo and Header */}
            <div className="text-center mb-8">
              <motion.div
                variants={logoVariants}
                className="w-20 h-20 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                >
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </motion.div>
              </motion.div>
              
              <motion.h1 
                variants={itemVariants}
                className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2"
              >
                {isSignUp ? 'Get Started' : 'Welcome Back'}
              </motion.h1>
              <motion.p 
                variants={itemVariants}
                className="text-gray-600 text-lg"
              >
                Sign in securely with Google
              </motion.p>
            </div>

            {/* Error Display */}
            <AnimatePresence>
              {localError && (
                <motion.div 
                  initial={{ opacity: 0, y: -20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <p className="text-red-700 text-sm flex-1">{localError}</p>
                  <button
                    onClick={clearError}
                    className="text-red-500 hover:text-red-700 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Google Sign-In Button */}
            <motion.button
              variants={itemVariants}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full h-14 bg-white border-2 border-gray-200 rounded-xl text-gray-700 font-semibold flex items-center justify-center gap-3 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed mb-6"
            >
              {isLoading ? (
                 <LoadingAnimation className="w-5 h-5" />
               ) : (
                <>
                  <Chrome className="w-5 h-5" />
                  <span>Continue with Google</span>
                </>
              )}
            </motion.button>

            {/* Divider */}
            <motion.div variants={itemVariants} className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500 font-medium">or continue with email</span>
              </div>
            </motion.div>

            {/* Email/Password Form */}
            <AnimatePresence mode="wait">
              <motion.form
                key={isSignUp ? 'signup' : 'signin'}
                initial={{ opacity: 0, x: isSignUp ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isSignUp ? -20 : 20 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-5"
              >
                {isSignUp && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Full Name
                    </label>
                    <div className="relative">
                      <UserPlus className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                      <input
                        {...register('name')}
                        type="text"
                        placeholder="Enter your full name"
                        className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
                      />
                    </div>
                    {errors.name && (
                      <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-red-500 text-sm mt-1 flex items-center gap-1"
                      >
                        <AlertCircle className="w-4 h-4" />
                        {errors.name?.message?.toString()}
                      </motion.p>
                    )}
                  </motion.div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                    <input
                      {...register('email')}
                      type="email"
                      placeholder="Enter your email"
                      className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
                    />
                  </div>
                  {errors.email && (
                    <motion.p 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-red-500 text-sm mt-1 flex items-center gap-1"
                    >
                      <AlertCircle className="w-4 h-4" />
                      {errors.email?.message?.toString()}
                    </motion.p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                    <input
                      {...register('password')}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      className="w-full pl-12 pr-12 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.password && (
                    <motion.p 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-red-500 text-sm mt-1 flex items-center gap-1"
                    >
                      <AlertCircle className="w-4 h-4" />
                      {errors.password?.message?.toString()}
                    </motion.p>
                  )}
                </div>

                {isSignUp && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                      <input
                        {...register('confirmPassword')}
                        type="password"
                        placeholder="Confirm your password"
                        className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
                      />
                    </div>
                    {errors.confirmPassword && (
                      <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-red-500 text-sm mt-1 flex items-center gap-1"
                      >
                        <AlertCircle className="w-4 h-4" />
                        {errors.confirmPassword?.message?.toString()}
                      </motion.p>
                    )}
                  </motion.div>
                )}

                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-14 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:via-purple-600 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                     <LoadingAnimation className="w-5 h-5" />
                   ) : (
                    <>
                      <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </motion.button>
              </motion.form>
            </AnimatePresence>

            {/* Switch Mode */}
            <motion.div variants={itemVariants} className="text-center mt-6">
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  reset();
                  clearError();
                }}
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors duration-200 font-medium"
              >
                {isSignUp 
                  ? 'Already have an account? Sign in' 
                  : "Don't have an account? Sign up"
                }
              </button>
            </motion.div>

            {/* Back to Home */}
            <motion.div variants={itemVariants} className="text-center mt-4">
              <Link 
                href="/"
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors duration-200"
              >
                ← Back to Home
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
      
      {/* Toast Container */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}