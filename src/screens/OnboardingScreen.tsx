import React from "react";

interface OnboardingScreenProps {
  onComplete: () => void;
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-4 h-full max-w-lg mx-auto">
      {/* Replace with actual logo later or a themed placeholder */}
      <div className="text-6xl mb-8 text-theme-accent"> {/* Themed logo placeholder */}
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
      </div>
      <h1 className="text-4xl sm:text-5xl font-bold mb-4 text-theme-text">
        Vibe Check
      </h1>
      <p className="text-xl sm:text-2xl text-theme-text/80 mb-12">Find Your Vibe.</p>
      <button
        onClick={onComplete}
        className="button-primary-highlight text-lg px-10 py-3" // Use new button style
      >
        Let's Go!
      </button>
    </div>
  );
};

export default OnboardingScreen;
