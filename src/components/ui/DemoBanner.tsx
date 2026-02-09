import { FlaskConical } from 'lucide-react';

interface DemoBannerProps {
  onConnect: () => void;
}

export default function DemoBanner({ onConnect }: DemoBannerProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-center gap-3 px-4 py-2.5 bg-amber-500 dark:bg-amber-600 text-white text-sm font-medium shadow-lg">
      <FlaskConical size={16} />
      <span>Exploring with sample data — changes won't be saved</span>
      <button
        onClick={onConnect}
        className="px-3 py-1 rounded-md bg-white/20 hover:bg-white/30 font-semibold transition-colors min-h-[32px]"
      >
        Connect Database
      </button>
    </div>
  );
}
