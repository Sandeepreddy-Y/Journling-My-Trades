export default function ResetPassword() {
  return (
    <>
      <h1 className="text-xl font-bold text-text-bright mb-1">Set new password</h1>
      <p className="text-sm text-text-secondary mb-6">Enter your new password below</p>
      <div className="space-y-4">
        <div>
          <label htmlFor="reset-password" className="block text-sm font-medium text-text-secondary mb-1.5">New Password</label>
          <input id="reset-password" type="password" placeholder="••••••••" className="w-full h-10 px-3 rounded-lg bg-bg-input border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus transition-colors" />
        </div>
        <div>
          <label htmlFor="reset-confirm" className="block text-sm font-medium text-text-secondary mb-1.5">Confirm Password</label>
          <input id="reset-confirm" type="password" placeholder="••••••••" className="w-full h-10 px-3 rounded-lg bg-bg-input border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus transition-colors" />
        </div>
        <button className="w-full h-10 bg-primary hover:bg-primary-hover text-white text-sm font-medium rounded-lg transition-colors" id="reset-submit">
          Reset Password
        </button>
      </div>
    </>
  );
}
