export interface Mood {
  name: string;
  emoji: string;
  color: string; // Tailwind background color class e.g., "bg-mood-happy"
  textColorVariable: string; // CSS variable for text e.g., "var(--color-mood-happy-text)"
}

export const MOOD_DETAILS: Mood[] = [
  { name: "Happy", emoji: "😄", color: "bg-mood-happy", textColorVariable: "var(--color-mood-happy-text)" },
  { name: "Chill", emoji: "😌", color: "bg-mood-chill", textColorVariable: "var(--color-mood-chill-text)" },
  { name: "Energetic", emoji: "⚡️", color: "bg-mood-energetic", textColorVariable: "var(--color-mood-energetic-text)" },
  { name: "Anxious", emoji: "😟", color: "bg-mood-anxious", textColorVariable: "var(--color-mood-anxious-text)" },
  { name: "Focused", emoji: "🎯", color: "bg-mood-focused", textColorVariable: "var(--color-mood-focused-text)" },
  { name: "Social", emoji: "🎉", color: "bg-mood-social", textColorVariable: "var(--color-mood-social-text)" },
];
