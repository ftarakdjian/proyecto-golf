'use client';

interface Props {
  message: string;
  onRetry?: () => void;
}

export default function ErrorMessage({ message, onRetry }: Props) {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-xl p-6 text-center"
      style={{ background: '#2a1a1a', border: '1px solid #5a2020' }}
    >
      <p className="text-red-400 text-sm">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: '#1a6b3c' }}
        >
          Reintentar
        </button>
      )}
    </div>
  );
}
