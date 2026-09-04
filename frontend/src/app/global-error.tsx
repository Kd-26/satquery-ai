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
    console.error("Root Layout Error caught:", error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex items-center justify-center bg-[#0d1117] p-6 text-[#c9d1d9] font-sans">
          <div className="max-w-md w-full bg-[#161b22] border border-[#f85149] rounded p-8 shadow-lg text-center">
            <h1 className="text-2xl font-bold tracking-tight mb-2 text-white">
              Fatal System Error
            </h1>
            <p className="text-[#8b949e] mb-6 text-sm">
              The application failed to mount completely.
            </p>
            <div className="bg-[#0d1117] border border-[#30363d] p-3 rounded mb-6 text-left overflow-auto">
              <p className="text-xs font-mono text-[#f85149] break-words">
                {error.message || "Unknown root layout error"}
              </p>
            </div>
            <Button
              onClick={() => reset()}
              variant="primary"
            >
              Attempt Recovery
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
