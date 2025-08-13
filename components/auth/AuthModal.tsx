'use client';
import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Mail, Lock, Chrome, Loader2 } from 'lucide-react';

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

const signUpSchema = signInSchema.extend({
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

type SignInForm = z.infer<typeof signInSchema>;
type SignUpForm = z.infer<typeof signUpSchema>;

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'signin'
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp, signInWithGoogle, error } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<SignUpForm>({
    resolver: zodResolver(mode === 'signin' ? signInSchema : signUpSchema)
  });

  const onSubmit = async (data: SignUpForm) => {
    setIsLoading(true);
    try {
      if (mode === 'signin') {
        await signIn(data.email, data.password);
      } else {
        await signUp(data.email, data.password);
      }
      onClose();
      reset();
    } catch (error) {
      console.error('Authentication error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      onClose();
    } catch (error) {
      console.error('Google sign in error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    reset();
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      title={mode === 'signin' ? 'Sign In' : 'Sign Up'}
      className="sm:max-w-md"
    >
      <div className="space-y-6 p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">
            {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-gray-600 mt-2">
            {mode === 'signin' 
              ? 'Sign in to access your traffic AI dashboard' 
              : 'Join thousands of users optimizing traffic flow'
            }
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm"
          >
            {error?.message || 'An error occurred'}
          </motion.div>
        )}

        <Button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          variant="outline"
          className="w-full h-12 border-gray-300 hover:bg-gray-50 flex items-center gap-3"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Chrome className="h-5 w-5" />
          )}
          Continue with Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">or</span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email Address
            </Label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                {...register('email')}
                id="email"
                type="email"
                placeholder="your@email.com"
                className="pl-10 h-12"
              />
            </div>
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="password" className="text-sm font-medium text-gray-700">
              Password
            </Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                {...register('password')}
                id="password"
                type="password"
                placeholder="••••••••"
                className="pl-10 h-12"
              />
            </div>
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
            )}
          </div>

          {mode === 'signup' && (
            <div>
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                Confirm Password
              </Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  {...register('confirmPassword')}
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 h-12"
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </Button>
        </form>

        <div className="text-center">
          <button
            onClick={switchMode}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {mode === 'signin' 
              ? "Don't have an account? Sign up" 
              : 'Already have an account? Sign in'
            }
          </button>
        </div>
      </div>
    </Modal>
  );
};