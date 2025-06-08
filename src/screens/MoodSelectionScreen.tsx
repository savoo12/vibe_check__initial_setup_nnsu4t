import React from "react";
import MoodBubble from "../components/MoodBubble";
import { Mood, MOOD_DETAILS } from "../moods";

interface MoodSelectionScreenProps {
  moods: Mood[];
  onMoodSelect: (moodName: string) => void;
  currentUserMood?: string | null;
}

const MoodSelectionScreen: React.FC<MoodSelectionScreenProps> = ({ moods, onMoodSelect, currentUserMood }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-4 w-full">
      <h2 className="text-3xl sm:text-4xl font-bold mb-2 text-theme-text">
        How are you vibing right now?
      </h2>
      {currentUserMood && (
        <p className="text-lg text-theme-text/80 mb-6">Your current vibe: <span className="font-semibold text-theme-highlight">{currentUserMood}</span></p>
      )}
      {!currentUserMood && (
        <p className="text-lg text-theme-text/80 mb-6">Select a mood to connect with others.</p>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-8 max-w-xl">
        {moods.map((mood) => (
          <MoodBubble
            key={mood.name}
            mood={mood}
            isSelected={currentUserMood === mood.name}
            onSelect={() => onMoodSelect(mood.name)}
          />
        ))}
      </div>
      <p className="text-sm text-theme-text/70 max-w-md">
        Your mood helps us find people who are on the same wavelength. You can change this anytime!
      </p>
    </div>
  );
};

export default MoodSelectionScreen;
