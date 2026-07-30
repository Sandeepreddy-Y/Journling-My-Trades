import { Link } from 'react-router-dom';

export default function ForgotPassword() {
  return (
    <>
      <h1 className="text-xl font-bold text-text-bright mb-1">Reset your password</h1>
      <p className="text-sm text-text-secondary mb-6">Enter your email and we'll send you a reset link</p>
      <div className="space-y-4">
        <div>
          <label htmlFor="forgot-email" className="block text-sm font-medium text-text-secondary mb-1.5">Email</label>
          <input id="forgot-email" type="email" placeholder="you@example.com" className="w-full h-10 px-3 rounded-lg bg-bg-input border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus transition-colors" />
        </div>
        <button className="w-full h-10 bg-primary hover:bg-primary-hover text-white text-sm font-medium rounded-lg transition-colors" id="forgot-submit">
          Send Reset Link
        </button>
      </div>
      <p className="text-sm text-text-secondary text-center mt-6">
        Remember your password? <Link to="/auth/login" className="text-primary hover:underline">Sign in</Link>
      </p>
    </>
  );
}
