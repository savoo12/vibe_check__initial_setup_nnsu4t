import React from "react";
import { PotentialMatchUserData } from "../../convex/users";
import { MOOD_DETAILS } from "../moods";

interface UserProfileCardProps {
  user: PotentialMatchUserData;
  onPass: () => void;
  onConnect: () => void;
}

const UserProfileCard: React.FC<UserProfileCardProps> = ({ user, onPass, onConnect }) => {
  const moodDetail = MOOD_DETAILS.find(m => m.name === user.currentMood) || MOOD_DETAILS[0];
  const moodTextColor = moodDetail.textColorVariable; // Use the CSS variable string

  return (
    <div className="content-card w-full max-w-sm mx-auto flex flex-col text-theme-text"> {/* Use content-card */}
      <div className="relative aspect-square w-full rounded-lg mb-4 overflow-hidden shadow-subtle">
        <img
          src={user.profilePictureUrl || `https://source.unsplash.com/random/400x400?portrait,face&sig=${user._id.substring(0,5)}`}
          alt={user.name ?? "User"}
          className="w-full h-full object-cover"
          onError={(e) => e.currentTarget.src = `https://source.unsplash.com/random/400x400?abstract,pattern&sig=${user._id.substring(0,5)}`}
        />
        {user.currentMood && moodDetail && (
          <div 
            className={`absolute top-2 right-2 px-3 py-1 rounded-full text-sm font-semibold shadow-md ${moodDetail.color}`}
            style={{ color: moodTextColor }} // Apply text color via style
          >
            {moodDetail.emoji} {user.currentMood}
          </div>
        )}
      </div>

      <h3 className="text-2xl font-bold mb-1">{user.name || "Anonymous Viber"}</h3>
      <p className="text-theme-text/80 text-sm mb-3 h-12 overflow-hidden"> {/* Increased height for bio */}
        {user.bio || "Just vibing..."}
      </p>
      
      <p className="text-xs text-theme-text/60 mb-4">📍 Somewhere awesome (location soon)</p>

      <div className="mt-auto flex gap-3 sm:gap-4">
        <button
          onClick={onPass}
          className="vibe-button-secondary flex-1 py-2 sm:py-3 text-base sm:text-lg" // Adjusted padding/text
        >
          Pass 👎
        </button>
        <button
          onClick={onConnect}
          className="vibe-button-primary flex-1 py-2 sm:py-3 text-base sm:text-lg" // Adjusted padding/text
        >
          Connect 👍
        </button>
      </div>
    </div>
  );
};

export default UserProfileCard;
