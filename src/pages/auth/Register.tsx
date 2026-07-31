import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, ShieldCheck, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

interface FormErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
}

/** Password strength levels */
type PasswordStrength = 0 | 1 | 2 | 3 | 4;

function getPasswordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score as PasswordStrength;
}

const STRENGTH_CONFIG: Record<PasswordStrength, { label: string; color: string; barColor: string }> = {
  0: { label: '', color: '', barColor: '' },
  1: { label: 'Weak', color: 'text-loss', barColor: 'bg-loss' },
  2: { label: 'Fair', color: 'text-warning', barColor: 'bg-warning' },
  3: { label: 'Good', color: 'text-primary', barColor: 'bg-primary' },
  4: { label: 'Strong', color: 'text-profit', barColor: 'bg-profit' },
};

const PASSWORD_RULES = [
  { test: (p: string) => p.length >= 8, label: 'At least 8 characters' },
  { test: (p: string) => /[A-Z]/.test(p), label: 'One uppercase letter' },
  { test: (p: string) => /[0-9]/.test(p), label: 'One number' },
  { test: (p: string) => /[^A-Za-z0-9]/.test(p), label: 'One special character' },
];

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  });

  const passwordStrength = getPasswordStrength(formData.password);
  const strengthInfo = STRENGTH_CONFIG[passwordStrength];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Clear field error on change
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.agreeTerms) {
      newErrors.terms = 'You must agree to the terms';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast.error('Please fix the errors below');
      return;
    }

    setIsLoading(true);

    try {
      await register({
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
      });
      toast.success('Account created successfully!');
      navigate('/');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Registration failed. Please check network connection.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Header */}
      <div className="text-center mb-1">
        <h2 className="text-2xl font-bold text-text-bright tracking-tight">
          Create your account
        </h2>
        <p className="text-sm text-text-secondary mt-1.5">
          Start journaling your trades today
        </p>
      </div>

      {/* Full Name */}
      <div className="space-y-1.5">
        <label htmlFor="register-name" className="block text-sm font-medium text-text-secondary">
          Full Name
        </label>
        <div className="relative group">
          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-text-muted group-focus-within:text-primary transition-colors duration-200" />
          <input
            id="register-name"
            name="fullName"
            type="text"
            value={formData.fullName}
            onChange={handleChange}
            placeholder="John Doe"
            autoComplete="name"
            className={`w-full h-11 pl-11 pr-4 rounded-xl bg-white/[0.04] border text-sm text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:bg-white/[0.06] focus:shadow-[0_0_0_3px_rgba(41,98,255,0.1)] transition-all duration-200 ${
              errors.fullName
                ? 'border-loss/60 focus:border-loss/80 focus:shadow-[0_0_0_3px_rgba(239,83,80,0.1)]'
                : 'border-white/[0.08] focus:border-primary/60'
            }`}
          />
        </div>
        {errors.fullName && (
          <p className="text-xs text-loss flex items-center gap-1 mt-1 animate-fade-in">
            <span className="inline-block w-1 h-1 rounded-full bg-loss" />
            {errors.fullName}
          </p>
        )}
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <label htmlFor="register-email" className="block text-sm font-medium text-text-secondary">
          Email address
        </label>
        <div className="relative group">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-text-muted group-focus-within:text-primary transition-colors duration-200" />
          <input
            id="register-email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="trader@example.com"
            autoComplete="email"
            className={`w-full h-11 pl-11 pr-4 rounded-xl bg-white/[0.04] border text-sm text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:bg-white/[0.06] focus:shadow-[0_0_0_3px_rgba(41,98,255,0.1)] transition-all duration-200 ${
              errors.email
                ? 'border-loss/60 focus:border-loss/80 focus:shadow-[0_0_0_3px_rgba(239,83,80,0.1)]'
                : 'border-white/[0.08] focus:border-primary/60'
            }`}
          />
        </div>
        {errors.email && (
          <p className="text-xs text-loss flex items-center gap-1 mt-1 animate-fade-in">
            <span className="inline-block w-1 h-1 rounded-full bg-loss" />
            {errors.email}
          </p>
        )}
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <label htmlFor="register-password" className="block text-sm font-medium text-text-secondary">
          Password
        </label>
        <div className="relative group">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-text-muted group-focus-within:text-primary transition-colors duration-200" />
          <input
            id="register-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
            autoComplete="new-password"
            className={`w-full h-11 pl-11 pr-12 rounded-xl bg-white/[0.04] border text-sm text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:bg-white/[0.06] focus:shadow-[0_0_0_3px_rgba(41,98,255,0.1)] transition-all duration-200 ${
              errors.password
                ? 'border-loss/60 focus:border-loss/80 focus:shadow-[0_0_0_3px_rgba(239,83,80,0.1)]'
                : 'border-white/[0.08] focus:border-primary/60'
            }`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-text-muted hover:text-text-secondary transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
          </button>
        </div>
        {errors.password && (
          <p className="text-xs text-loss flex items-center gap-1 mt-1 animate-fade-in">
            <span className="inline-block w-1 h-1 rounded-full bg-loss" />
            {errors.password}
          </p>
        )}

        {/* Password Strength Bar */}
        {formData.password.length > 0 && (
          <div className="space-y-2 pt-1 animate-fade-in">
            <div className="flex items-center gap-2">
              <div className="flex-1 flex gap-1">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                      level <= passwordStrength
                        ? strengthInfo.barColor
                        : 'bg-white/[0.06]'
                    }`}
                  />
                ))}
              </div>
              <span className={`text-xs font-medium ${strengthInfo.color}`}>
                {strengthInfo.label}
              </span>
            </div>

            {/* Password Rules Checklist */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              {PASSWORD_RULES.map(({ test, label }) => {
                const passed = test(formData.password);
                return (
                  <div key={label} className="flex items-center gap-1.5">
                    <div
                      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all duration-200 ${
                        passed ? 'bg-profit/20' : 'bg-white/[0.04]'
                      }`}
                    >
                      <Check
                        className={`w-2.5 h-2.5 transition-all duration-200 ${
                          passed ? 'text-profit' : 'text-text-muted/40'
                        }`}
                      />
                    </div>
                    <span
                      className={`text-[11px] transition-colors duration-200 ${
                        passed ? 'text-text-secondary' : 'text-text-muted/60'
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Confirm Password */}
      <div className="space-y-1.5">
        <label htmlFor="register-confirm" className="block text-sm font-medium text-text-secondary">
          Confirm Password
        </label>
        <div className="relative group">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-text-muted group-focus-within:text-primary transition-colors duration-200" />
          <input
            id="register-confirm"
            name="confirmPassword"
            type={showConfirm ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="••••••••"
            autoComplete="new-password"
            className={`w-full h-11 pl-11 pr-12 rounded-xl bg-white/[0.04] border text-sm text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:bg-white/[0.06] focus:shadow-[0_0_0_3px_rgba(41,98,255,0.1)] transition-all duration-200 ${
              errors.confirmPassword
                ? 'border-loss/60 focus:border-loss/80 focus:shadow-[0_0_0_3px_rgba(239,83,80,0.1)]'
                : formData.confirmPassword && formData.password === formData.confirmPassword
                  ? 'border-profit/40'
                  : 'border-white/[0.08] focus:border-primary/60'
            }`}
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-text-muted hover:text-text-secondary transition-colors"
            aria-label={showConfirm ? 'Hide password' : 'Show password'}
          >
            {showConfirm ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
          </button>
          {/* Match indicator */}
          {formData.confirmPassword && formData.password === formData.confirmPassword && (
            <div className="absolute right-12 top-1/2 -translate-y-1/2 animate-fade-in">
              <Check className="w-4 h-4 text-profit" />
            </div>
          )}
        </div>
        {errors.confirmPassword && (
          <p className="text-xs text-loss flex items-center gap-1 mt-1 animate-fade-in">
            <span className="inline-block w-1 h-1 rounded-full bg-loss" />
            {errors.confirmPassword}
          </p>
        )}
      </div>

      {/* Terms & Conditions */}
      <div className="space-y-1">
        <label className="flex items-start gap-3 cursor-pointer group" htmlFor="agree-terms">
          <div className="relative mt-0.5">
            <input
              id="agree-terms"
              name="agreeTerms"
              type="checkbox"
              checked={formData.agreeTerms}
              onChange={handleChange}
              className="peer sr-only"
            />
            <div
              className={`w-[18px] h-[18px] rounded-[5px] border bg-white/[0.04] peer-checked:bg-primary peer-checked:border-primary transition-all duration-200 flex items-center justify-center ${
                errors.terms ? 'border-loss/60' : 'border-white/[0.12]'
              }`}
            >
              {formData.agreeTerms && (
                <svg
                  className="w-3 h-3 text-white animate-fade-in"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>
          <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors leading-snug">
            I agree to the{' '}
            <button type="button" className="text-primary hover:text-primary/80 transition-colors">
              Terms of Service
            </button>{' '}
            and{' '}
            <button type="button" className="text-primary hover:text-primary/80 transition-colors">
              Privacy Policy
            </button>
          </span>
        </label>
        {errors.terms && (
          <p className="text-xs text-loss flex items-center gap-1 pl-[30px] animate-fade-in">
            <span className="inline-block w-1 h-1 rounded-full bg-loss" />
            {errors.terms}
          </p>
        )}
      </div>

      {/* Register Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="group relative w-full h-11 rounded-xl bg-gradient-to-r from-primary to-[#1E88E5] text-white text-sm font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-primary/25 hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-none overflow-hidden"
        id="register-submit"
      >
        {/* Shimmer effect */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full pointer-events-none"
          style={{ transition: 'transform 0.8s, opacity 0.3s' }}
        />

        <span className="relative flex items-center justify-center gap-2">
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating account...
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" />
              Create Account
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </>
          )}
        </span>
      </button>

      {/* Login Link */}
      <p className="text-center text-sm text-text-secondary pt-1">
        Already have an account?{' '}
        <Link
          to="/auth/login"
          className="text-primary font-medium hover:text-primary/80 transition-colors"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
