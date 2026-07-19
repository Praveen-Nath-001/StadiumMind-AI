import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod'; // note: we can write plain zod validation inline to avoid extra dependencies if resolver version matches
import { z } from 'zod';
import api from '../services/api';
import useAccessibility from '../hooks/useAccessibility';
import Link from 'next/link';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFields = z.infer<typeof loginSchema>;

export default function Login() {
  const router = useRouter();
  const { speak } = useAccessibility();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFields>({
    resolver: async (data) => {
      try {
        const parsed = loginSchema.parse(data);
        return { values: parsed, errors: {} };
      } catch (err: any) {
        const formattedErrors: any = {};
        err.errors.forEach((e: any) => {
          formattedErrors[e.path[0]] = { message: e.message };
        });
        return { values: {}, errors: formattedErrors };
      }
    },
  });

  const onSubmit = async (data: LoginFields) => {
    setError(null);
    setLoading(true);
    speak('Logging in. Please wait.');

    try {
      const res = await api.post('/auth/login', data);
      const { tokens, user } = res.data;

      localStorage.setItem('sm_access_token', tokens.accessToken);
      localStorage.setItem('sm_refresh_token', tokens.refreshToken);
      localStorage.setItem('sm_user_role', user.role);
      localStorage.setItem('sm_user_name', user.name);

      speak(`Login successful. Welcome back ${user.name}`);

      // Route based on role
      if (user.role === 'OPERATOR' || user.role === 'ADMIN') {
        router.push('/dashboard');
      } else {
        router.push('/');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Login failed. Invalid email or password.';
      setError(errMsg);
      speak(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#05070F] px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 glass-panel p-8 rounded-2xl shadow-glass border border-white/10">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-white font-heading">
            Sign in to <span className="text-brand-accent">StadiumMind AI</span>
          </h2>
          <p className="mt-2 text-center text-sm text-brand-textMuted">
            Official Tournament Operations & Fan Companion
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-900/30 border border-red-500/50 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-brand-text mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                className="relative block w-full appearance-none rounded-lg border border-white/10 bg-brand-dark px-3 py-2 text-white placeholder-gray-500 focus:z-10 focus:border-brand-accent focus:outline-none sm:text-sm"
                placeholder="fan@stadiummind.ai"
                {...register('email')}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-brand-crimson">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-brand-text mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                className="relative block w-full appearance-none rounded-lg border border-white/10 bg-brand-dark px-3 py-2 text-white placeholder-gray-500 focus:z-10 focus:border-brand-accent focus:outline-none sm:text-sm"
                placeholder="••••••••"
                {...register('password')}
              />
              {errors.password && (
                <p className="mt-1 text-xs text-brand-crimson">{errors.password.message}</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-lg border border-transparent bg-brand-accent px-4 py-3 text-sm font-bold text-brand-dark transition-all duration-300 hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </div>

          <div className="text-center text-sm text-brand-textMuted mt-4">
            Don't have an account?{' '}
            <Link href="/register" className="font-semibold text-brand-accent hover:underline">
              Register here
            </Link>
          </div>

          {/* Seed demo quick logins */}
          <div className="border-t border-white/10 pt-4 mt-6">
            <p className="text-xs text-center text-brand-textMuted mb-2">Demo Quick Logins (Password: password123):</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  (document.getElementById('email') as HTMLInputElement).value = 'fan@stadiummind.ai';
                  (document.getElementById('password') as HTMLInputElement).value = 'password123';
                }}
                className="text-[10px] bg-brand-card hover:bg-brand-card/80 border border-white/10 py-1.5 rounded text-white"
              >
                Fan User
              </button>
              <button
                type="button"
                onClick={() => {
                  (document.getElementById('email') as HTMLInputElement).value = 'volunteer@stadiummind.ai';
                  (document.getElementById('password') as HTMLInputElement).value = 'password123';
                }}
                className="text-[10px] bg-brand-card hover:bg-brand-card/80 border border-white/10 py-1.5 rounded text-white"
              >
                Volunteer
              </button>
              <button
                type="button"
                onClick={() => {
                  (document.getElementById('email') as HTMLInputElement).value = 'admin@stadiummind.ai';
                  (document.getElementById('password') as HTMLInputElement).value = 'password123';
                }}
                className="text-[10px] bg-brand-card hover:bg-brand-card/80 border border-white/10 py-1.5 rounded text-white"
              >
                Operator (Admin)
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
