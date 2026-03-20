import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconLayoutDashboard,
  IconUser,
  IconMail,
  IconPhone,
  IconBriefcase,
  IconCalendar,
  IconClock,
  IconUserCircle,
  IconCheck,
  IconX,
  IconAlertCircle,
} from '@tabler/icons-react';
import { webinarsApi } from '@/api/endpoints/webinars';
import type { Webinar } from '@/types';
import toast from 'react-hot-toast';

interface FormData {
  name: string;
  email: string;
  phone: string;
  organization: string;
}

interface FormErrors {
  name?: string;
  email?: string;
}

export const WebinarLanding = () => {
  const { id } = useParams<{ id: string }>();
  const [webinar, setWebinar] = useState<Webinar | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    organization: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (id) {
      fetchWebinar();
    }
  }, [id]);

  const fetchWebinar = async () => {
    try {
      setLoading(true);
      setNotFound(false);
      const response = await webinarsApi.getById(id!);
      setWebinar(response.data);
    } catch (error: any) {
      console.error('Error fetching webinar:', error);
      if (error.response?.status === 404) {
        setNotFound(true);
      } else {
        toast.error('Failed to load webinar details');
      }
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    try {
      setSubmitting(true);
      await webinarsApi.register({
        webinar_id: id!,
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        organization: formData.organization || undefined,
      });

      setShowSuccessModal(true);

      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        organization: '',
      });
      setErrors({});
    } catch (error: any) {
      console.error('Error registering for webinar:', error);
      const errorMessage = error.response?.data?.message || 'Registration failed. Please try again.';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getWebinarStatus = () => {
    if (!webinar) return 'upcoming';
    const now = new Date();
    const scheduledDate = new Date(webinar.start_time);
    const endDate = new Date(scheduledDate.getTime() + webinar.duration * 60000);

    if (now >= scheduledDate && now <= endDate) {
      return 'live';
    } else if (now > endDate) {
      return 'completed';
    }
    return 'upcoming';
  };

  const status = getWebinarStatus();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#E8E6E1] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-gray-300 border-t-[#3D3532] mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading webinar details...</p>
        </motion.div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#E8E6E1] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
            <IconAlertCircle className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Webinar Not Found</h1>
          <p className="text-gray-600 text-lg">
            The webinar you're looking for doesn't exist or has been removed.
          </p>
        </motion.div>
      </div>
    );
  }

  if (!webinar) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#E8E6E1] p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="h-14 w-14 shrink-0 rounded-full bg-[#3D3532] flex items-center justify-center shadow-lg">
              <IconLayoutDashboard className="w-7 h-7 text-white" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">LMS Portal</h1>
              <p className="text-sm text-gray-600">Professional Learning Platform</p>
            </div>
          </div>
        </motion.div>

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#C4B5FD] via-[#A78BFA] to-[#8B5CF6] p-8 md:p-12 shadow-xl mb-6"
        >
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl"></div>

          <div className="relative z-10">
            {/* Status Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex mb-6"
            >
              <div
                className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 ${
                  status === 'live'
                    ? 'bg-red-500 text-white animate-pulse'
                    : status === 'upcoming'
                    ? 'bg-white/20 text-white backdrop-blur-sm'
                    : 'bg-gray-800 text-white'
                }`}
              >
                {status === 'live' && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-white"></span>
                    LIVE NOW
                  </>
                )}
                {status === 'upcoming' && (
                  <>
                    <IconCalendar className="w-4 h-4" />
                    UPCOMING
                  </>
                )}
                {status === 'completed' && 'COMPLETED'}
              </div>
            </motion.div>

            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight"
            >
              {webinar.topic}
            </motion.h2>

            {/* Description */}
            {webinar.description && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-white/90 text-base md:text-lg mb-8 max-w-3xl leading-relaxed"
              >
                {webinar.description}
              </motion.p>
            )}

            {/* Info Grid */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
              {/* Date & Time */}
              <div className="bg-white/10 backdrop-blur-sm rounded-[20px] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <IconCalendar className="w-5 h-5 text-white" />
                  <span className="text-white/80 text-sm font-medium">Date & Time</span>
                </div>
                <p className="text-white font-semibold text-sm mb-1">
                  {formatDate(webinar.start_time)}
                </p>
                <p className="text-white text-sm">{formatTime(webinar.start_time)}</p>
              </div>

              {/* Duration */}
              <div className="bg-white/10 backdrop-blur-sm rounded-[20px] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <IconClock className="w-5 h-5 text-white" />
                  <span className="text-white/80 text-sm font-medium">Duration</span>
                </div>
                <p className="text-white font-bold text-2xl">
                  {webinar.duration}{' '}
                  <span className="text-base font-medium">minutes</span>
                </p>
              </div>

              {/* Instructor */}
              <div className="bg-white/10 backdrop-blur-sm rounded-[20px] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <IconUserCircle className="w-5 h-5 text-white" />
                  <span className="text-white/80 text-sm font-medium">Instructor</span>
                </div>
                <p className="text-white font-semibold text-base">
                  {webinar.instructor?.name || 'TBA'}
                </p>
                {webinar.instructor?.email && (
                  <p className="text-white/70 text-xs mt-1">{webinar.instructor.email}</p>
                )}
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Registration Form Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white rounded-[28px] shadow-xl p-8 md:p-10"
        >
          <div className="mb-8">
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              Register for this Webinar
            </h3>
            <p className="text-gray-600">
              Fill in your details below to secure your spot
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <IconUser className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  className={`w-full pl-12 pr-4 py-3.5 rounded-xl border-2 transition-all duration-200 ${
                    errors.name
                      ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                      : 'border-gray-200 focus:border-[#3D3532] focus:ring-4 focus:ring-gray-100'
                  } outline-none text-gray-900`}
                />
              </div>
              {errors.name && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-500 text-sm mt-1.5 flex items-center gap-1"
                >
                  <IconAlertCircle className="w-4 h-4" />
                  {errors.name}
                </motion.p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <IconMail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="you@example.com"
                  className={`w-full pl-12 pr-4 py-3.5 rounded-xl border-2 transition-all duration-200 ${
                    errors.email
                      ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                      : 'border-gray-200 focus:border-[#3D3532] focus:ring-4 focus:ring-gray-100'
                  } outline-none text-gray-900`}
                />
              </div>
              {errors.email && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-500 text-sm mt-1.5 flex items-center gap-1"
                >
                  <IconAlertCircle className="w-4 h-4" />
                  {errors.email}
                </motion.p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Phone Number <span className="text-gray-400 text-xs">(Optional)</span>
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <IconPhone className="w-5 h-5" />
                </div>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+1 (555) 000-0000"
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-[#3D3532] focus:ring-4 focus:ring-gray-100 outline-none transition-all duration-200 text-gray-900"
                />
              </div>
            </div>

            {/* Organization */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Organization/Company <span className="text-gray-400 text-xs">(Optional)</span>
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <IconBriefcase className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  name="organization"
                  value={formData.organization}
                  onChange={handleInputChange}
                  placeholder="Your company name"
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-[#3D3532] focus:ring-4 focus:ring-gray-100 outline-none transition-all duration-200 text-gray-900"
                />
              </div>
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={submitting}
              whileHover={{ scale: submitting ? 1 : 1.02 }}
              whileTap={{ scale: submitting ? 1 : 0.98 }}
              className={`w-full py-4 rounded-xl font-bold text-white text-lg transition-all duration-200 shadow-lg ${
                submitting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-[#3D3532] hover:bg-[#2D2520] hover:shadow-xl'
              }`}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Registering...
                </span>
              ) : (
                'Register Now'
              )}
            </motion.button>

            <p className="text-center text-sm text-gray-500 mt-4">
              By registering, you'll receive the webinar join link via email
            </p>
          </form>
        </motion.div>
      </div>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 z-50"
            onClick={() => setShowSuccessModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="bg-white rounded-[28px] p-8 md:p-10 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Success Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center mx-auto mb-6 shadow-lg"
              >
                <IconCheck className="w-10 h-10 text-white" strokeWidth={3} />
              </motion.div>

              {/* Success Message */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-center mb-6"
              >
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                  Registration Successful!
                </h3>
                <p className="text-gray-600 mb-4">
                  Check your email for the join link
                </p>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500 mb-1">Confirmation sent to:</p>
                  <p className="text-gray-900 font-semibold">{formData.email}</p>
                </div>
              </motion.div>

              {/* Close Button */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                onClick={() => setShowSuccessModal(false)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3.5 rounded-xl bg-[#3D3532] hover:bg-[#2D2520] text-white font-bold transition-colors duration-200"
              >
                Close
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
