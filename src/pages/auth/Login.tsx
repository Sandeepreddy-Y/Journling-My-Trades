import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: true,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);

    try {
      await login({ email: formData.email, password: formData.password, rememberMe: formData.rememberMe });
      toast.success('Welcome back, Trader!');
      navigate('/');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Login failed. Please check your credentials.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    try {
      await login({ email: 'trader@example.com', password: 'Password123!', rememberMe: true });
      toast.success('Welcome to TradeTrack Pro Demo!');
      navigate('/');
    } catch {
      toast.error('Demo account not available. Please register a new account.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Header */}
      <div className="text-center mb-2">
        <h2 className="text-2xl font-bold text-text-bright tracking-tight">
          Welcome back
        </h2>
        <p className="text-sm text-text-secondary mt-1.5">
          Sign in to continue your trading journal
        </p>
      </div>

      {/* Instant Demo Login Button */}
      <button
        type="button"
        onClick={handleDemoLogin}
        disabled={isLoading}
        className="w-full h-11 rounded-xl bg-profit/15 border border-profit/30 hover:bg-profit/25 text-profit text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg"
        id="demo-login-btn"
      >
        <Zap className="w-4 h-4 text-profit animate-bounce" />
        <span>One-Click Instant Demo Login</span>
      </button>

      {/* Divider */}
      <div className="relative flex items-center">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
        <span className="px-4 text-xs text-text-muted uppercase tracking-widest">or login with credentials</span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
      </div>

      {/* Email Field */}
      <div className="space-y-1.5">
        <label htmlFor="login-email" className="block text-sm font-medium text-text-secondary">
          Email address
        </label>
        <div className="relative group">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-text-muted group-focus-within:text-primary transition-colors duration-200" />
          <input
            id="login-email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="trader@example.com"
            autoComplete="email"
            className="w-full h-11 pl-11 pr-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-primary/60 focus:bg-white/[0.06] focus:shadow-[0_0_0_3px_rgba(41,98,255,0.1)] transition-all duration-200"
          />
        </div>
      </div>

      {/* Password Field */}
      <div className="space-y-1.5">
        <label htmlFor="login-password" className="block text-sm font-medium text-text-secondary">
          Password
        </label>
        <div className="relative group">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-text-muted group-focus-within:text-primary transition-colors duration-200" />
          <input
            id="login-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
            autoComplete="current-password"
            className="w-full h-11 pl-11 pr-12 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-primary/60 focus:bg-white/[0.06] focus:shadow-[0_0_0_3px_rgba(41,98,255,0.1)] transition-all duration-200"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-text-muted hover:text-text-secondary transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <EyeOff className="w-[18px] h-[18px]" />
            ) : (
              <Eye className="w-[18px] h-[18px]" />
            )}
          </button>
        </div>
      </div>

      {/* Remember Me + Forgot Password */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2.5 cursor-pointer group" htmlFor="remember-me">
          <div className="relative">
            <input
              id="remember-me"
              name="rememberMe"
              type="checkbox"
              checked={formData.rememberMe}
              onChange={handleChange}
              className="peer sr-only"
            />
            <div className="w-[18px] h-[18px] rounded-[5px] border border-white/[0.12] bg-white/[0.04] peer-checked:bg-primary peer-checked:border-primary transition-all duration-200 flex items-center justify-center">
              {formData.rememberMe && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>
          <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
            Remember me
          </span>
        </label>

        <Link
          to="/auth/forgot-password"
          className="text-sm text-primary/80 hover:text-primary transition-colors"
        >
          Forgot password?
        </Link>
      </div>

      {/* Login Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="group relative w-full h-11 rounded-xl bg-gradient-to-r from-primary to-[#1E88E5] text-white text-sm font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-primary/25 hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-none overflow-hidden"
        id="login-submit"
      >
        <span className="relative flex items-center justify-center gap-2">
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              Sign In
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </>
          )}
        </span>
      </button>

      {/* Sign Up Link */}
      <p className="text-center text-sm text-text-secondary pt-2">
        Don&apos;t have an account?{' '}
        <Link
          to="/auth/register"
          className="text-primary font-medium hover:text-primary/80 transition-colors"
        >
          Create one free
        </Link>
      </p>
    </form>
  );
}
