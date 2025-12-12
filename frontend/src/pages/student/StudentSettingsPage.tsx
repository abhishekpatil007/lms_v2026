import React, { useState } from 'react';
import { Sidebar, SidebarBody, SidebarLink } from '@/components/ui/sidebar';
import {
  IconSchool,
  IconLogout,
  IconSettings,
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
import { useNavigate } from 'react-router-dom';

export const StudentSettingsPage = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const links = [
    {
      label: 'My Batches',
      href: '/student/batches',
      icon: <IconSchool className="h-6 w-6 shrink-0 text-white" strokeWidth={2} />,
    },
    {
      label: 'Settings',
      href: '/student/settings',
      icon: <IconSettings className="h-6 w-6 shrink-0 text-white" strokeWidth={2} />,
    },
  ];

  return (
    <div className="flex w-full h-screen bg-[#E8E6E1]">
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
            {open ? <Logo /> : <LogoIcon />}
            <div className="mt-8 flex flex-col gap-1">
              {links.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
          </div>
          <div>
            <SidebarLink
              link={{
                label: user?.name || 'Student',
                href: '/student/profile',
                icon: (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-[#3D3532] shadow-sm">
                    {user?.name?.charAt(0).toUpperCase() || 'S'}
                  </div>
                ),
              }}
            />
            <button
              onClick={handleLogout}
              className="mt-2 flex w-full items-center gap-3 py-3 px-3 rounded-lg transition-all duration-200 hover:bg-white/10 text-white"
              title="Logout"
            >
              <IconLogout className="h-6 w-6 shrink-0" strokeWidth={2} />
              <motion.span
                animate={{
                  display: open ? 'inline-block' : 'none',
                  opacity: open ? 1 : 0,
                }}
                className="!m-0 inline-block whitespace-pre !p-0 text-sm font-semibold"
              >
                Logout
              </motion.span>
            </button>
          </div>
        </SidebarBody>
      </Sidebar>
      <SettingsContent user={user} />
    </div>
  );
};

export const Logo = () => {
  return (
    <a
      href="/student/batches"
      className="relative z-20 flex items-center space-x-2.5 py-1 text-sm font-normal"
    >
      <div className="h-12 w-12 shrink-0 rounded-full bg-white flex items-center justify-center shadow-sm">
        <IconSchool className="w-6 h-6 text-[#3D3532]" strokeWidth={2} />
      </div>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-bold whitespace-pre text-white text-base"
      >
        LMS Portal
      </motion.span>
    </a>
  );
};

export const LogoIcon = () => {
  return (
    <a
      href="/student/batches"
      className="relative z-20 flex items-center justify-center"
    >
      <div className="h-12 w-12 shrink-0 rounded-full bg-white flex items-center justify-center shadow-sm">
        <IconSchool className="w-6 h-6 text-[#3D3532]" strokeWidth={2} />
      </div>
    </a>
  );
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
      <div className="flex h-full w-full flex-1 flex-col gap-6 p-6 md:p-10">
        <div className="px-4 sm:px-0">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">Settings</h1>
            <p className="text-lg text-gray-500">Manage your account settings and preferences</p>
          </motion.div>

          {/* Tabs */}
          <div className="mb-6 flex gap-3">
            <button
              onClick={() => setActiveTab('profile')}
              className={`rounded-xl px-6 py-3 text-sm font-semibold transition-all ${
                activeTab === 'profile'
                  ? 'bg-[#3D3532] text-white shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab('password')}
              className={`rounded-xl px-6 py-3 text-sm font-semibold transition-all ${
                activeTab === 'password'
                  ? 'bg-[#3D3532] text-white shadow-lg'
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
              className="rounded-[28px] bg-white p-8 shadow-lg"
            >
              <h2 className="mb-6 text-2xl font-bold text-gray-900">Profile Information</h2>

              <div className="space-y-6">
                {/* User Avatar */}
                <div className="flex items-center gap-6">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#C4B5FD] to-[#A78BFA] text-3xl font-bold text-white shadow-lg">
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
              className="rounded-[28px] bg-white p-8 shadow-lg"
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
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-11 text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-[#3D3532] focus:bg-white focus:ring-2 focus:ring-[#3D3532]/10"
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
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-11 text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-[#3D3532] focus:bg-white focus:ring-2 focus:ring-[#3D3532]/10"
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

                <div className="flex gap-4 pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-xl bg-[#3D3532] px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-[#2D2522] disabled:cursor-not-allowed disabled:opacity-50"
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
