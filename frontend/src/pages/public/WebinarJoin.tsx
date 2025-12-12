import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  IconLayoutDashboard,
  IconCheck,
  IconX,
  IconClock,
  IconVideo,
  IconAlertTriangle,
  IconCalendar,
  IconArrowLeft,
  IconLoader,
} from '@tabler/icons-react';
import { webinarsApi } from '@/api/endpoints/webinars';
import type { Webinar } from '@/types';
import axios from 'axios';

type JoinState = 'loading' | 'success' | 'error' | 'not_started' | 'ended';

interface JoinData {
  joinUrl: string;
  meetingId: string;
  password?: string;
  webinar?: Webinar;
}

interface ErrorData {
  type: 'not_registered' | 'ended' | 'invalid_link' | 'generic';
  message: string;
}

export const WebinarJoin = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [state, setState] = useState<JoinState>('loading');
  const [joinData, setJoinData] = useState<JoinData | null>(null);
  const [errorData, setErrorData] = useState<ErrorData | null>(null);

  useEffect(() => {
    verifyAndJoin();
  }, [id]);

  const verifyAndJoin = async () => {
    try {
      setState('loading');

      // Get registration token from query params
      const registrationToken = searchParams.get('token');

      if (!registrationToken) {
        setErrorData({
          type: 'invalid_link',
          message: 'No registration token provided. Please use the link from your email.',
        });
        setState('error');
        return;
      }

      if (!id) {
        setErrorData({
          type: 'invalid_link',
          message: 'Invalid webinar ID.',
        });
        setState('error');
        return;
      }

      // Temporarily store the token for the API call
      localStorage.setItem('webinar-temp-token', registrationToken);

      try {
        // Call the join API with the token in the Authorization header
        const response = await webinarsApi.join(id);

        // Clear the temporary token
        localStorage.removeItem('webinar-temp-token');

        // Set join data
        setJoinData(response);
        setState('success');
      } catch (error: any) {
        // Clear the temporary token
        localStorage.removeItem('webinar-temp-token');

        // Handle different error cases
        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          const message = error.response?.data?.message || 'An error occurred';

          if (status === 403 || message.toLowerCase().includes('not registered')) {
            setErrorData({
              type: 'not_registered',
              message: 'You are not registered for this webinar.',
            });
          } else if (status === 410 || message.toLowerCase().includes('ended') || message.toLowerCase().includes('completed')) {
            setErrorData({
              type: 'ended',
              message: 'This webinar has ended.',
            });
          } else if (status === 401 || message.toLowerCase().includes('invalid') || message.toLowerCase().includes('expired')) {
            setErrorData({
              type: 'invalid_link',
              message: 'Invalid or expired registration link.',
            });
          } else if (message.toLowerCase().includes('not started') || message.toLowerCase().includes('upcoming')) {
            // Webinar hasn't started yet
            setState('not_started');
            return;
          } else {
            setErrorData({
              type: 'generic',
              message: message,
            });
          }
        } else {
          setErrorData({
            type: 'generic',
            message: 'Failed to verify registration. Please try again.',
          });
        }

        setState('error');
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setErrorData({
        type: 'generic',
        message: 'An unexpected error occurred. Please try again.',
      });
      setState('error');
      localStorage.removeItem('webinar-temp-token');
    }
  };

  const handleJoinWebinar = () => {
    if (joinData?.joinUrl) {
      window.open(joinData.joinUrl, '_blank');
    }
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getWebinarStatus = (webinar?: Webinar) => {
    if (!webinar) return 'upcoming';
    const now = new Date();
    const scheduledDate = new Date(webinar.scheduled_at);
    const endDate = new Date(scheduledDate.getTime() + webinar.duration_minutes * 60000);

    if (now >= scheduledDate && now <= endDate) {
      return 'live';
    } else if (now > endDate) {
      return 'completed';
    }
    return 'upcoming';
  };

  const webinarStatus = getWebinarStatus(joinData?.webinar);

  return (
    <div className="min-h-screen bg-[#E8E6E1] flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 shrink-0 rounded-full bg-[#3D3532] flex items-center justify-center shadow-lg">
                <IconLayoutDashboard className="w-7 h-7 text-white" strokeWidth={2} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">LMS Portal</h1>
                <p className="text-sm text-gray-600">Professional Learning Platform</p>
              </div>
            </div>

            <motion.button
              onClick={handleBackToHome}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-gray-700 font-semibold shadow-md hover:shadow-lg transition-all duration-200"
            >
              <IconArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Back</span>
            </motion.button>
          </div>
        </motion.div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full"
        >
          {/* Loading State */}
          {state === 'loading' && (
            <div className="bg-white rounded-[28px] shadow-xl p-8 md:p-12">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
                  <IconLoader className="w-10 h-10 text-[#3D3532] animate-spin" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                  Verifying your registration...
                </h2>
                <p className="text-gray-600">
                  Please wait while we confirm your details
                </p>
              </div>
            </div>
          )}

          {/* Success State - Webinar is Live/Upcoming */}
          {state === 'success' && joinData && (
            <div className="bg-gradient-to-br from-[#B4F481] to-[#9FE66F] rounded-[28px] shadow-xl p-8 md:p-12">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="w-20 h-20 rounded-full bg-white flex items-center justify-center mx-auto mb-6 shadow-lg"
              >
                <IconCheck className="w-10 h-10 text-[#9FE66F]" strokeWidth={3} />
              </motion.div>

              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                  {joinData.webinar?.title || 'Webinar Ready'}
                </h2>

                {joinData.webinar && (
                  <div className="space-y-3 mb-6">
                    {/* Status Badge */}
                    <div className="inline-flex">
                      <div
                        className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 ${
                          webinarStatus === 'live'
                            ? 'bg-red-500 text-white animate-pulse'
                            : webinarStatus === 'upcoming'
                            ? 'bg-white/30 text-gray-900 backdrop-blur-sm'
                            : 'bg-gray-800 text-white'
                        }`}
                      >
                        {webinarStatus === 'live' && (
                          <>
                            <span className="w-2 h-2 rounded-full bg-white"></span>
                            LIVE NOW
                          </>
                        )}
                        {webinarStatus === 'upcoming' && (
                          <>
                            <IconCalendar className="w-4 h-4" />
                            UPCOMING
                          </>
                        )}
                        {webinarStatus === 'completed' && 'COMPLETED'}
                      </div>
                    </div>

                    {/* Date & Time */}
                    <div className="flex items-center justify-center gap-4 text-gray-800">
                      <div className="flex items-center gap-2">
                        <IconCalendar className="w-5 h-5" />
                        <span className="font-semibold">
                          {formatDate(joinData.webinar.scheduled_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <IconClock className="w-5 h-5" />
                        <span className="font-semibold">
                          {formatTime(joinData.webinar.scheduled_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 mb-6">
                  <p className="text-gray-800 font-semibold mb-2">
                    You are registered for this webinar!
                  </p>
                  <p className="text-gray-700 text-sm">
                    Click the button below to join via Zoom
                  </p>
                </div>
              </div>

              <motion.button
                onClick={handleJoinWebinar}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 rounded-xl bg-[#3D3532] hover:bg-[#2D2520] text-white font-bold text-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
              >
                <IconVideo className="w-6 h-6" />
                Join Webinar
              </motion.button>

              {joinData.meetingId && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-700">
                    Meeting ID: <span className="font-mono font-semibold">{joinData.meetingId}</span>
                  </p>
                  {joinData.password && (
                    <p className="text-sm text-gray-700">
                      Password: <span className="font-mono font-semibold">{joinData.password}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Not Started State */}
          {state === 'not_started' && (
            <div className="bg-gradient-to-br from-[#FDE68A] to-[#FCD34D] rounded-[28px] shadow-xl p-8 md:p-12">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="w-20 h-20 rounded-full bg-white flex items-center justify-center mx-auto mb-6 shadow-lg"
              >
                <IconClock className="w-10 h-10 text-[#FCD34D]" strokeWidth={2.5} />
              </motion.div>

              <div className="text-center">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                  Webinar Not Started Yet
                </h2>
                <p className="text-gray-800 mb-6">
                  The webinar hasn't started yet. Please check your email for the scheduled time and return when it's about to begin.
                </p>
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                  <p className="text-gray-700 text-sm">
                    You'll receive a reminder email before the webinar starts
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error States */}
          {state === 'error' && errorData && (
            <div
              className={`rounded-[28px] shadow-xl p-8 md:p-12 ${
                errorData.type === 'ended'
                  ? 'bg-gradient-to-br from-gray-300 to-gray-400'
                  : 'bg-gradient-to-br from-[#FCA5A5] to-[#EF4444]'
              }`}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="w-20 h-20 rounded-full bg-white flex items-center justify-center mx-auto mb-6 shadow-lg"
              >
                {errorData.type === 'ended' ? (
                  <IconClock className="w-10 h-10 text-gray-500" strokeWidth={2.5} />
                ) : errorData.type === 'invalid_link' ? (
                  <IconAlertTriangle className="w-10 h-10 text-[#EF4444]" strokeWidth={2.5} />
                ) : (
                  <IconX className="w-10 h-10 text-[#EF4444]" strokeWidth={3} />
                )}
              </motion.div>

              <div className="text-center">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                  {errorData.type === 'not_registered' && 'Not Registered'}
                  {errorData.type === 'ended' && 'Webinar Ended'}
                  {errorData.type === 'invalid_link' && 'Invalid Link'}
                  {errorData.type === 'generic' && 'Error'}
                </h2>
                <p className="text-white/90 mb-6">
                  {errorData.message}
                </p>

                {errorData.type === 'not_registered' && (
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                    <p className="text-white text-sm">
                      Please register for the webinar to receive a join link
                    </p>
                  </div>
                )}

                {errorData.type === 'ended' && (
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                    <p className="text-white text-sm">
                      This webinar has concluded. Check your email for any recording links.
                    </p>
                  </div>
                )}

                {errorData.type === 'invalid_link' && (
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                    <p className="text-white text-sm">
                      Please use the link from your registration confirmation email
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>

        {/* Footer Note */}
        {state !== 'loading' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center mt-6"
          >
            <p className="text-sm text-gray-600">
              Need help? Contact support at{' '}
              <a href="mailto:support@lmsportal.com" className="text-[#3D3532] font-semibold hover:underline">
                support@lmsportal.com
              </a>
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};
