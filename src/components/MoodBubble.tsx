import React from "react";
import { Mood } from "../moods"; // Mood interface defines structure

interface MoodBubbleProps {
  mood: Mood;
  isSelected: boolean;
  onSelect: () => void;
}

// Helper to get themed text color for mood bubbles
const getMoodTextColor = (moodName: string): string => {
  switch(moodName) {
    case "Happy": return "var(--color-mood-happy-text)";
    // Add other cases if specific text colors are needed for contrast
    default: return "var(--color-theme-text)"; // Default to theme text
  }
}

const MoodBubble: React.FC<MoodBubbleProps> = ({ mood, isSelected, onSelect }) => {
  // Use mood.color which should be a Tailwind bg class like 'bg-mood-happy'
  // The text color will be dynamically set or use a default from the theme
  const textColorStyle = { color: getMoodTextColor(mood.name) };

  return (
    <button
      onClick={onSelect}
      className={`
        flex flex-col items-center justify-center
        w-32 h-32 sm:w-36 sm:h-36 
        rounded-bubble m-1 p-3 sm:p-4
        transform transition-all duration-200 ease-in-out
        hover:scale-105 focus:outline-none
        shadow-subtle hover:shadow-md
        ${mood.color} /* This should be like bg-mood-happy */
        ${isSelected ? 'ring-4 ring-theme-highlight scale-105 shadow-md' : ''}
        group
      `}
      style={!isSelected ? { backgroundColor: mood.color.replace('bg-','var(--color-') + ')'} : {}} // Directly apply if not selected for non-Tailwind colors
      aria-pressed={isSelected}
      aria-label={`Select mood: ${mood.name}`}
    >
      <span className="text-4xl sm:text-5xl mb-1 sm:mb-2 transition-transform duration-200 group-hover:scale-110" style={textColorStyle}>
        {mood.emoji}
      </span>
      <span className={`font-semibold text-xs sm:text-sm text-center`} style={textColorStyle}>
        {mood.name}
      </span>
    </button>
  );
};

export default MoodBubble;
