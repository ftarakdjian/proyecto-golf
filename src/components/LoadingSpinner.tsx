'use client';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };

export default function LoadingSpinner({ size = 'md', message }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`${sizes[size]} rounded-full border-2 border-transparent animate-spin`}
        style={{ borderTopColor: '#1a6b3c', borderRightColor: '#c9a84c' }}
      />
      {message && <p className="text-golf-muted text-sm">{message}</p>}
    </div>
  );
}
