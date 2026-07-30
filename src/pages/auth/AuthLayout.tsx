import { Outlet } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';

/**
 * Premium auth layout with animated particle background,
 * floating orbs, and glassmorphism card container.
 */
export default function AuthLayout() {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#060911] p-4 sm:p-6">

      {/* ── Animated Background Layer ── */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {/* Gradient mesh */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(41,98,255,0.15)_0%,transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(38,166,154,0.1)_0%,transparent_50%)]" />

        {/* Floating orb — top right */}
        <div
          className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, #2962FF 0%, transparent 70%)',
            animation: 'floatOrb 8s ease-in-out infinite',
          }}
        />

        {/* Floating orb — bottom left */}
        <div
          className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full opacity-15"
          style={{
            background: 'radial-gradient(circle, #26A69A 0%, transparent 70%)',
            animation: 'floatOrb 10s ease-in-out infinite reverse',
          }}
        />

        {/* Floating orb — center accent */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full opacity-8"
          style={{
            background: 'radial-gradient(circle, #7C3AED 0%, transparent 70%)',
            animation: 'floatOrb 12s ease-in-out infinite 2s',
          }}
        />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        {/* Animated particles */}
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white/10"
            style={{
              width: `${Math.random() * 3 + 1}px`,
              height: `${Math.random() * 3 + 1}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `particleFloat ${Math.random() * 10 + 10}s linear infinite`,
              animationDelay: `${Math.random() * 10}s`,
            }}
          />
        ))}
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 w-full max-w-[440px]" style={{ animation: 'authCardEntry 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}>

        {/* Branding */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-primary/15 animate-pulse-glow">
            <TrendingUp className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-text-bright tracking-tight">
            TradeTrack<span className="text-gradient">Pro</span>
          </h1>
        </div>

        {/* Glassmorphism Card */}
        <div className="relative rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden">
          {/* Top glow line */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

          <div className="p-8 sm:p-10">
            <Outlet />
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-text-muted mt-6">
          © 2026 TradeTrack Pro. All rights reserved.
        </p>
      </div>
    </div>
  );
}
