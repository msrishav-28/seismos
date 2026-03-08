"use client";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html>
            <body className="min-h-screen bg-[#0E0E0E] text-white flex items-center justify-center p-4">
                <div className="max-w-md w-full text-center space-y-6">
                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold text-red-500">
                            Something went wrong
                        </h1>
                        <p className="text-white/40 text-sm">
                            An unexpected error occurred. Please try again.
                        </p>
                    </div>
                    <button
                        onClick={reset}
                        className="px-6 py-3 bg-white text-black rounded-full text-xs font-bold uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all duration-500"
                    >
                        Try Again
                    </button>
                    {process.env.NODE_ENV === "development" && (
                        <details className="mt-4 text-left">
                            <summary className="cursor-pointer text-sm text-white/30 hover:text-white/60">
                                Error details
                            </summary>
                            <pre className="mt-2 text-xs bg-white/5 p-4 rounded-xl overflow-auto text-white/50">
                                {error.message}
                                {error.stack && (
                                    <div className="mt-2 text-white/20">{error.stack}</div>
                                )}
                            </pre>
                        </details>
                    )}
                </div>
            </body>
        </html>
    );
}
