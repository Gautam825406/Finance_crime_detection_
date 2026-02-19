"use client";

interface ErrorDisplayProps {
  errors: Array<{ row: number; message: string }>;
}

export function ErrorDisplay({ errors }: ErrorDisplayProps) {
  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 shadow-card">
      <h3 className="text-red-400 font-semibold text-sm mb-3 flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-red-500/20 flex items-center justify-center">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        Validation Errors
      </h3>
      <ul className="space-y-1.5 max-h-48 overflow-y-auto">
        {errors.slice(0, 20).map((err, idx) => (
          <li key={idx} className="text-red-300/80 text-xs font-mono">
            Row {err.row}: {err.message}
          </li>
        ))}
        {errors.length > 20 && (
          <li className="text-red-400/60 text-xs">...and {errors.length - 20} more errors</li>
        )}
      </ul>
    </div>
  );
}

interface ApiErrorDisplayProps {
  message: string;
}

export function ApiErrorDisplay({ message }: ApiErrorDisplayProps) {
  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 shadow-card">
      <h3 className="text-red-400 font-semibold text-sm mb-2 flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-red-500/20 flex items-center justify-center">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        Analysis Error
      </h3>
      <p className="text-red-300/80 text-sm">{message}</p>
    </div>
  );
}
