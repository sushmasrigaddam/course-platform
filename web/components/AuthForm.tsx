'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { authenticateUser } from '../lib/api';
import type { userlogin } from '../types';

type AuthFormProps = {
  mode: 'login' | 'signup';
};

export default function AuthForm({ mode }: AuthFormProps) {
  const isSignup = mode === 'signup';
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const credentials: userlogin = isSignup ? { name, email, password } : { email, password };

    try {
      const result = await authenticateUser(isSignup ? 'signup' : 'login', credentials);
      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
      router.push('/dashboard/my-courses');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="w-1/2 bg-[#3B38D0] text-white flex flex-col justify-center p-12">
        <div className="grid grid-cols-1 gap-24">
          <h1 className="text-4xl font-bold tracking-tight">Learnly</h1>
          <div>
            <h2 className="text-4xl font-semibold">Welcome back. Your next lesson is waiting.</h2>
            <ul className="mt-4 space-y-2 list-disc list-inside">
              <li>Resume exactly where you stopped</li>
              <li>Track progress across every course</li>
              <li>Learn from working instructors</li>
            </ul>
          </div>
          <p>&copy; 2023 Learnly. All rights reserved.</p>
        </div>
      </div>

      <div className="w-1/2 bg-[#F7F6F3] flex flex-col justify-center px-16">
        <div className="max-w-md w-full mx-auto">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {isSignup ? 'Create an account' : 'Sign in'}
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            {isSignup ? 'Enter your details to create an account' : 'Enter your details to access your account'}
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}
            {isSignup && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  minLength={2}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3B38D0]"
                  placeholder="Enter your name"
                />
              </div>
            )}
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3B38D0]"
              placeholder="Enter your email"
            />
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={isSignup ? 6 : 1}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3B38D0]"
              placeholder="Enter your password"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#3B38D0] hover:bg-[#2F2CB0] text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              {loading ? 'Please wait...' : isSignup ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="mt-4 text-sm text-gray-500">
              {isSignup ? 'Already have an account?' : 'New to Learnly?'}
              <Link
                href={isSignup ? '/login' : '/signup'}
                className="ml-1 text-[#3B38D0] hover:text-[#2F2CB0] font-medium"
              >
                {isSignup ? 'Sign In' : 'Create an account'}
              </Link>
            </p>
            <Link href="/" className="mt-2 text-sm text-gray-500">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
