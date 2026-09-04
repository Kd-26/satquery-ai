"use client";

import { useEffect } from "react";
import { Button } from "../components/ui/Button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Optionally log the error to an error reporting service like Sentry
    console.error("Global Error Boundary caught an error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary p-6 text-text-primary font-sans">
      <div className="max-w-md w-full bg-panel border border-danger rounded-DEFAULT p-8 shadow-lg text-center">
        <div className="mb-6 flex justify-center">
          <div className="h-16 w-16 bg-danger/20 text-danger flex items-center justify-center rounded-full">
            <svg
              className="h-8 w-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">
          Application Error
        </h1>
        <p className="text-text-secondary mb-6 text-sm">
          A critical error occurred in the UI. Our systems have logged the fault, but you may need to reload the application.
        </p>
        
        <div className="bg-panel-raised border border-subtle p-3 rounded mb-6 text-left overflow-auto max-h-32">
          <p className="text-xs font-mono text-danger break-words">
            {error.message || "Unknown error occurred"}
          </p>
        </div>

        <div className="flex gap-4 justify-center">
          <Button
            onClick={() => reset()}
            variant="primary"
          >
            Try Again
          </Button>
          <Button
            onClick={() => window.location.href = '/'}
            variant="secondary"
          >
            Return to Home
          </Button>
        </div>
      </div>
    </div>
  );
}
