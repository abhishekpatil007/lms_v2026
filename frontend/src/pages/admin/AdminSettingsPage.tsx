import React, { useState } from 'react';
import {
  IconLock,
  IconEye,
  IconEyeOff,
  IconCheck,
  IconUser,
  IconMail,
} from '@tabler/icons-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/api/endpoints/auth';

export const AdminSettingsPage = () => {
  const { user } = useAuthStore();
  return <SettingsContent user={user} />;
};

const SettingsContent = ({ user }: { user: any }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);

    try {
      await authApi.changePassword({ oldPassword, newPassword });
      setSuccess('Password changed successfully!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to change password. Please check your current password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 overflow-auto">
      <div className="flex h-full w-full flex-1 flex-col gap-6 p-3 sm:p-4 md:p-7">
        <div>
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className=""
          >
            <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-2">Settings</h1>
            <p className="text-sm md:text-base text-gray-500">Manage your account settings and preferences</p>
          </motion.div>

          {/* Tabs */}
          <div className="mb-6 flex gap-3">
            <button
              onClick={() => setActiveTab('profile')}
              className={`rounded-xl px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'profile'
                  ? 'bg-gray-800 text-white shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab('password')}
              className={`rounded-xl px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'password'
                  ? 'bg-gray-800 text-white shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Password
            </button>
          </div>

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-white p-4 sm:p-6 md:p-8 border border-gray-200"
            >
              <h2 className="mb-6 text-2xl font-bold text-gray-900">Profile Information</h2>

              <div className="space-y-6">
                {/* User Avatar */}
                <div className="flex items-center gap-6">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-300 to-violet-400 text-3xl font-bold text-white shadow-lg">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{user?.name}</h3>
                    <p className="text-sm text-gray-500 capitalize">{user?.role}</p>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">Full Name</label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                      <IconUser className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={user?.name || ''}
                      disabled
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-gray-900 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">Email Address</label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                      <IconMail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-gray-900 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-700">
                  <p>
                    <strong>Note:</strong> To update your profile information, please contact your administrator.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Password Tab */}
          {activeTab === 'password' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-white p-4 sm:p-6 md:p-8 border border-gray-200"
            >
              <h2 className="mb-6 text-2xl font-bold text-gray-900">Change Password</h2>

              <form onSubmit={handlePasswordChange} className="space-y-6">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl bg-red-50 p-4 text-sm text-red-600"
                  >
                    {error}
                  </motion.div>
                )}

                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl bg-green-50 p-4 text-sm text-green-600 flex items-center gap-2"
                  >
                    <IconCheck className="h-5 w-5" />
                    {success}
                  </motion.div>
                )}

                {/* Current Password */}
                <div>
                  <label htmlFor="oldPassword" className="mb-2 block text-sm font-semibold text-gray-700">
                    Current Password
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                      <IconLock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="oldPassword"
                      type={showOldPassword ? 'text' : 'password'}
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="Enter current password"
                      required
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-11 text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-gray-800 focus:bg-white focus:ring-2 focus:ring-gray-800/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPassword(!showOldPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600"
                    >
                      {showOldPassword ? (
                        <IconEyeOff className="h-5 w-5" />
                      ) : (
                        <IconEye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* New Password */}
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
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      required
                      minLength={8}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-11 text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-gray-800 focus:bg-white focus:ring-2 focus:ring-gray-800/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? (
                        <IconEyeOff className="h-5 w-5" />
                      ) : (
                        <IconEye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-gray-500">Must be at least 8 characters long</p>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label htmlFor="confirmPassword" className="mb-2 block text-sm font-semibold text-gray-700">
                    Confirm New Password
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
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-11 text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-gray-800 focus:bg-white focus:ring-2 focus:ring-gray-800/10"
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

                <div className="flex gap-4 pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-xl bg-gray-800 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? 'Changing Password...' : 'Change Password'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};
