import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import api from '../services/api';
import useAccessibility from '../hooks/useAccessibility';
import Link from 'next/link';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['FAN', 'VOLUNTEER', 'OPERATOR']).default('FAN'),
});

type RegisterFields = z.infer<typeof registerSchema>;

export default function Register() {
  const router = useRouter();
  const { speak } = useAccessibility();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFields>({
    resolver: async (data) => {
      try {
        const parsed = registerSchema.parse(data);
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

  const onSubmit = async (data: RegisterFields) => {
    setError(null);
    setLoading(true);
    speak('Creating your profile. Please wait.');

    try {
      const res = await api.post('/auth/register', data);
      const { tokens, user } = res.data;

      localStorage.setItem('sm_access_token', tokens.accessToken);
      localStorage.setItem('sm_refresh_token', tokens.refreshToken);
      localStorage.setItem('sm_user_role', user.role);
      localStorage.setItem('sm_user_name', user.name);

      speak(`Profile created successfully. Welcome to Stadium Mind AI, ${user.name}`);

      if (user.role === 'OPERATOR') {
        router.push('/dashboard');
      } else {
        router.push('/');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Registration failed. Try again.';
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
          <h2 className="text-center text-3xl font-extrabold tracking-tight text-white font-heading">
            Register for <span className="text-brand-accent">StadiumMind AI</span>
          </h2>
          <p className="mt-2 text-center text-sm text-brand-textMuted">
            Join the smart tournament ecosystem
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-900/30 border border-red-500/50 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        <form className="mt-6 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-brand-text mb-1">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                required
                className="relative block w-full appearance-none rounded-lg border border-white/10 bg-brand-dark px-3 py-2 text-white placeholder-gray-500 focus:z-10 focus:border-brand-accent focus:outline-none sm:text-sm"
                placeholder="Jane Fan"
                {...register('name')}
              />
              {errors.name && (
                <p className="mt-1 text-xs text-brand-crimson">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-brand-text mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                className="relative block w-full appearance-none rounded-lg border border-white/10 bg-brand-dark px-3 py-2 text-white placeholder-gray-500 focus:z-10 focus:border-brand-accent focus:outline-none sm:text-sm"
                placeholder="jane@fifa2026.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-brand-crimson">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-brand-text mb-1">
                Account Type / Role
              </label>
              <select
                id="role"
                className="relative block w-full appearance-none rounded-lg border border-white/10 bg-brand-dark px-3 py-2 text-white placeholder-gray-500 focus:z-10 focus:border-brand-accent focus:outline-none sm:text-sm"
                {...register('role')}
              >
                <option value="FAN" className="bg-brand-dark text-white">Tournament Fan / Spectator</option>
                <option value="VOLUNTEER" className="bg-brand-dark text-white">Event Volunteer Staff</option>
                <option value="OPERATOR" className="bg-brand-dark text-white">Stadium Operations Commander</option>
              </select>
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
              className="group relative flex w-full justify-center rounded-lg border border-transparent bg-brand-accent px-4 py-3 text-sm font-bold text-brand-dark transition-all duration-300 hover:bg-yellow-400 focus:outline-none"
            >
              {loading ? 'Registering...' : 'Register'}
            </button>
          </div>

          <div className="text-center text-sm text-brand-textMuted mt-4">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-brand-accent hover:underline">
              Log in instead
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
