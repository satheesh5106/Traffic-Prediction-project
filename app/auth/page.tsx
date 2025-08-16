'use client';
import * as React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegistrationForm } from '@/components/auth/RegistrationForm';
import { PasswordResetForm } from '@/components/auth/PasswordResetForm';
import { useAuth } from '@/hooks/useAuth';
import { Chrome } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const dynamic = 'force-dynamic';

export default function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const router = useRouter();
  const { signInWithGoogle, loading, user } = useAuth();
  const { toast } = useToast();

  // If user is already logged in, redirect to dashboard
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      toast({
        title: 'Success',
        description: 'You have been signed in successfully!',
        onClose: () => {},
        type: 'success',
      });
      router.push('/dashboard');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign in with Google';
      toast({
        title: 'Error',
        description: errorMessage,
        onClose: () => {},
        type: 'error',
      });
    }
  };

  const handleSuccess = () => {
    toast({
      title: 'Success',
      onClose: () => {},
      description: mode === 'signin' 
        ? 'You have been signed in successfully!' 
        : 'Your account has been created successfully!',
      type: 'success',
    });
    router.push('/dashboard');
  };

  if (user) {
    return null;
  }

  return (
    <div className="container mx-auto max-w-md py-12">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-6">
          {mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Reset Password'}
        </h1>

        <Tabs value={mode} onValueChange={(value) => setMode(value as any)} className="w-full">
          {mode !== 'reset' && (
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="signin" className="space-y-4">
            <LoginForm onSuccess={handleSuccess} />
            
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <Chrome className="mr-2 h-4 w-4" />
              Google
            </Button>
            
            <div className="text-center mt-6">
              <button 
                type="button" 
                onClick={() => setMode('reset')} 
                className="text-sm text-blue-600 hover:underline"
              >
                Forgot password?
              </button>
            </div>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4">
            <RegistrationForm onSuccess={handleSuccess} />
            
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <Chrome className="mr-2 h-4 w-4" />
              Google
            </Button>
          </TabsContent>

          <TabsContent value="reset" className="space-y-4">
            <PasswordResetForm />
            
            <div className="text-center mt-6">
              <button 
                type="button" 
                onClick={() => setMode('signin')} 
                className="text-sm text-blue-600 hover:underline"
              >
                Back to sign in
              </button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}