import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { IconLock, IconEye, IconEyeOff, IconCheck } from '@tabler/icons-react';
import { authApi } from '@/api/endpoints/auth';

export const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const emailParam = searchParams.get('email');
    const tokenParam = searchParams.get('token');

    if (emailParam) setEmail(emailParam);
    if (tokenParam) setToken(tokenParam);

    if (!emailParam || !tokenParam) {
      setError('Invalid reset link. Please request a new password reset.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);

    try {
      await authApi.resetPassword({ email, token, newPassword });
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password. The link may have expired.');
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
            <h2 className="mb-3 text-2xl font-bold text-gray-900">Password Reset Successful!</h2>
            <p className="mb-6 text-gray-600">
              Your password has been successfully reset. You can now log in with your new password.
            </p>
            <p className="text-sm text-gray-500">
              Redirecting to login page...
            </p>
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
          <h1 className="mb-2 text-4xl font-bold text-gray-900">Reset Password</h1>
          <p className="text-gray-600">
            Enter your new password below
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
              <label htmlFor="newPassword" className="mb-2 block text-sm font-semibold text-gray-700">
                New Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <IconLock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  minLength={8}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-11 text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-[#3D3532] focus:bg-white focus:ring-2 focus:ring-[#3D3532]/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <IconEyeOff className="h-5 w-5" />
                  ) : (
                    <IconEye className="h-5 w-5" />
                  )}
                </button>
              </div>
              <p className="mt-1.5 text-xs text-gray-500">
                Must be at least 8 characters long
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-2 block text-sm font-semibold text-gray-700">
                Confirm Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <IconLock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  minLength={8}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-11 text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-[#3D3532] focus:bg-white focus:ring-2 focus:ring-[#3D3532]/10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? (
                    <IconEyeOff className="h-5 w-5" />
                  ) : (
                    <IconEye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !token}
              className="w-full rounded-xl bg-[#3D3532] py-3 text-sm font-semibold text-white transition-all hover:bg-[#2D2522] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Resetting Password...' : 'Reset Password'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
