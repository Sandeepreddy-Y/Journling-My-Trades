import { useNavigate } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-6">
      <div className="text-center animate-slide-up">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-warning-light mb-6">
          <AlertTriangle className="w-8 h-8 text-warning" />
        </div>
        <h1 className="text-6xl font-extrabold text-text-bright mb-2">404</h1>
        <p className="text-lg text-text-secondary mb-8">
          This page doesn't exist or has been moved.
        </p>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg transition-colors"
        >
          <Home className="w-4 h-4" />
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
