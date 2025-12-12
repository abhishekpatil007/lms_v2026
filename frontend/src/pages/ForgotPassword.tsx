import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { IconMail, IconArrowLeft, IconCheck } from '@tabler/icons-react';
import { authApi } from '@/api/endpoints/auth';

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authApi.requestPasswordReset(email);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#E8E6E1] px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <div className="rounded-[28px] bg-white p-8 shadow-lg text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <IconCheck className="h-8 w-8 text-green-600" strokeWidth={2} />
            </div>
            <h2 className="mb-3 text-2xl font-bold text-gray-900">Check Your Email</h2>
            <p className="mb-6 text-gray-600">
              We've sent a password reset link to <strong>{email}</strong>
            </p>
            <p className="mb-8 text-sm text-gray-500">
              Please check your inbox and click the link to reset your password. The link will expire in 1 hour.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-[#3D3532] px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-[#2D2522]"
            >
              <IconArrowLeft className="h-4 w-4" />
              Back to Login
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#E8E6E1] px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold text-gray-900">Forgot Password?</h1>
          <p className="text-gray-600">
            No worries, we'll send you reset instructions
          </p>
        </div>

        <div className="rounded-[28px] bg-white p-8 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl bg-red-50 p-4 text-sm text-red-600"
              >
                {error}
              </motion.div>
            )}

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-gray-700">
                Email Address
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <IconMail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  required
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-[#3D3532] focus:bg-white focus:ring-2 focus:ring-[#3D3532]/10"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#3D3532] py-3 text-sm font-semibold text-white transition-all hover:bg-[#2D2522] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
            >
              <IconArrowLeft className="h-4 w-4" />
              Back to Login
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
