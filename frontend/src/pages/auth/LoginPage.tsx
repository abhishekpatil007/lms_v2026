import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff } from 'lucide-react';
import { authApi } from '../../api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

interface LoginFormData {
  email: string;
  password: string;
}

const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-2xl border border-gray-200 bg-white/50 backdrop-blur-sm transition-all focus-within:border-violet-400 focus-within:bg-violet-50/50">
    {children}
  </div>
);

export const LoginPage = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const response = await authApi.login(data.email, data.password);
      setAuth(response.user, response.tokens);
      toast.success('Login successful!');

      if (response.user.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (response.user.role === 'instructor') {
        navigate('/instructor/batches');
      } else {
        navigate('/student/dashboard');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left Column - Sign In Form */}
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-md">
          {/* Animated Title Section */}
          <div className="mb-8 space-y-2">
            <h1
              className="animate-fade-in text-4xl font-light tracking-tight text-gray-900"
              style={{ animationDelay: '100ms' }}
            >
              Welcome
            </h1>
            <p
              className="animate-fade-in text-sm text-gray-600"
              style={{ animationDelay: '200ms' }}
            >
              Access your account and continue your journey with us
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email Input */}
            <div
              className="animate-fade-in space-y-2"
              style={{ animationDelay: '300ms' }}
            >
              <label htmlFor="email" className="text-sm font-medium text-gray-900">
                Email address
              </label>
              <GlassInputWrapper>
                <input
                  id="email"
                  type="email"
                  {...register('email', { required: 'Email is required' })}
                  placeholder="your@email.com"
                  className="w-full rounded-2xl bg-transparent px-4 py-3 text-sm outline-none placeholder:text-gray-400"
                />
              </GlassInputWrapper>
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            {/* Password Input */}
            <div
              className="animate-fade-in space-y-2"
              style={{ animationDelay: '400ms' }}
            >
              <label htmlFor="password" className="text-sm font-medium text-gray-900">
                Password
              </label>
              <GlassInputWrapper>
                <div className="flex items-center">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    {...register('password', { required: 'Password is required' })}
                    placeholder="Enter your password"
                    className="w-full rounded-2xl bg-transparent px-4 py-3 text-sm outline-none placeholder:text-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="mr-3 text-gray-400 hover:text-gray-900 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </GlassInputWrapper>
              {errors.password && (
                <p className="text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>

            {/* Keep Signed In & Reset Password */}
            <div
              className="animate-fade-in flex items-center justify-between"
              style={{ animationDelay: '500ms' }}
            >
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={keepSignedIn}
                  onChange={(e) => setKeepSignedIn(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-violet-500 focus:ring-violet-500"
                />
                <span className="text-gray-600">Keep me signed in</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-sm text-violet-500 hover:text-violet-600 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="animate-fade-in w-full rounded-2xl bg-gradient-to-r from-violet-500 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 transition-all hover:shadow-xl hover:shadow-violet-500/40 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ animationDelay: '600ms' }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Info Text */}
          <p
            className="animate-fade-in mt-8 text-center text-xs text-gray-500"
            style={{ animationDelay: '700ms' }}
          >
            Access is restricted to registered students only. Contact your administrator for credentials.
          </p>
        </div>
      </div>

      {/* Right Column - Hero Section (Hidden on Mobile) */}
      <div className="relative hidden lg:block lg:w-1/2">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage:
              'url(https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1471&q=80)',
          }}
        >
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 via-transparent to-blue-500/20"></div>

          {/* Testimonial Cards - Floating Animation */}
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <div className="space-y-6">
              {/* Testimonial 1 */}
              <div
                className="animate-float ml-16 flex max-w-sm items-start gap-3 rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur-xl"
                style={{ animationDelay: '0ms' }}
              >
                <img
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop"
                  className="h-10 w-10 rounded-2xl object-cover"
                  alt="User avatar"
                />
                <div className="text-sm leading-snug text-white">
                  <p className="font-medium">Alex Thompson</p>
                  <p className="text-white/60">@alexthompson</p>
                  <p className="mt-2 text-white/80">
                    "This platform has transformed the way I work. Highly recommended!"
                  </p>
                </div>
              </div>

              {/* Testimonial 2 */}
              <div
                className="animate-float flex max-w-sm items-start gap-3 rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur-xl"
                style={{ animationDelay: '1000ms' }}
              >
                <img
                  src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop"
                  className="h-10 w-10 rounded-2xl object-cover"
                  alt="User avatar"
                />
                <div className="text-sm leading-snug text-white">
                  <p className="font-medium">Sarah Chen</p>
                  <p className="text-white/60">@sarahchen</p>
                  <p className="mt-2 text-white/80">
                    "Incredible experience! The interface is intuitive and powerful."
                  </p>
                </div>
              </div>

              {/* Testimonial 3 */}
              <div
                className="animate-float ml-32 flex max-w-sm items-start gap-3 rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur-xl"
                style={{ animationDelay: '2000ms' }}
              >
                <img
                  src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop"
                  className="h-10 w-10 rounded-2xl object-cover"
                  alt="User avatar"
                />
                <div className="text-sm leading-snug text-white">
                  <p className="font-medium">Michael Rodriguez</p>
                  <p className="text-white/60">@michaelr</p>
                  <p className="mt-2 text-white/80">
                    "Best decision I made this year. Game changer for productivity!"
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
