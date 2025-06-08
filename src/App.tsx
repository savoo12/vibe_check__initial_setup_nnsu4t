import { useConvexAuth } from "convex/react";
import { Toaster } from "sonner";
import VibeCheckApp from "./VibeCheckApp";
import { SignInForm } from "./SignInForm";

export default function App() {
  const { isLoading, isAuthenticated } = useConvexAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-theme-primary">
        <div className="loading-spinner"></div> {/* Updated spinner class */}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-theme-primary text-theme-text">
      <Toaster position="top-center" toastOptions={{
        classNames: {
          toast: 'bg-theme-secondary text-theme-text border-theme-accent/50 shadow-md rounded-lg',
          success: 'border-mood-focused/80',
          error: 'border-mood-energetic/80', // Assuming energetic is a reddish color for errors
          info: 'border-mood-chill/80',
        }
      }} />
      {isAuthenticated ? (
        <VibeCheckApp />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
          <header className="absolute top-0 left-0 right-0 h-16 flex justify-between items-center px-4 sm:px-8 py-4">
            <h2 className="text-2xl font-bold text-theme-text">Vibe Check</h2>
          </header>
          <div className="w-full max-w-md mx-auto content-card p-8"> {/* Updated card class */}
            <div className="text-center mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-theme-text mb-2">Welcome!</h1>
              <p className="text-lg text-theme-text/80">Sign in to find your vibe.</p>
            </div>
            <SignInForm />
          </div>
        </div>
      )}
    </div>
  );
}
