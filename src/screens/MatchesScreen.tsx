import React from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { MatchData } from "../../convex/matches";
import { MOOD_DETAILS } from "../moods";
import { Id } from "../../convex/_generated/dataModel";

interface MatchesScreenProps {
  navigateToChat: (conversationId: Id<"conversations">, otherUserName?: string) => void;
}

interface MatchCardProps {
  match: MatchData;
  onStartChat: (conversationId: Id<"conversations">, otherUserName?: string) => void;
}

const MatchCard: React.FC<MatchCardProps> = ({ match, onStartChat }) => {
  const moodDetail = MOOD_DETAILS.find(m => m.name === match.otherUser.currentMood);

  const handleChatClick = () => {
    if (match.conversationId) {
      onStartChat(match.conversationId, match.otherUser.name);
    } else {
      // This case should ideally not happen if conversations are created with matches
      console.error("No conversation ID found for this match:", match.matchId);
      // Potentially trigger a mutation to create/find conversation here if needed as a fallback
    }
  };

  return (
    <div className="content-card flex items-center gap-4 p-4 w-full">
      <img
        src={match.otherUser.profilePictureUrl || `https://source.unsplash.com/random/100x100?person&sig=${match.otherUser.authUserId.substring(0,5)}`}
        alt={match.otherUser.name || "Matched User"}
        className="w-16 h-16 rounded-full object-cover shadow-subtle"
        onError={(e) => e.currentTarget.src = `https://source.unsplash.com/random/100x100?abstract&sig=${match.otherUser.authUserId.substring(0,5)}`}
      />
      <div className="flex-1 min-w-0"> {/* Added min-w-0 for better truncation */}
        <h3 className="text-lg font-semibold text-theme-text truncate">{match.otherUser.name || "Viber"}</h3>
        {match.otherUser.currentMood && moodDetail && (
          <div className="flex items-center text-xs">
            <span className="mr-1">{moodDetail.emoji}</span>
            <span style={{ color: moodDetail.textColorVariable }}>{match.otherUser.currentMood}</span>
          </div>
        )}
        {/* Future: Last message preview */}
        {/* <p className="text-sm text-theme-text/70 truncate">Hey, how's it going?</p> */}
      </div>
      <button
        onClick={handleChatClick}
        className="button-primary text-sm px-4 py-2 shrink-0" // Added shrink-0
        disabled={!match.conversationId} // Disable if no conversation ID
      >
        Chat
      </button>
    </div>
  );
};

const MatchesScreen: React.FC<MatchesScreenProps> = ({ navigateToChat }) => {
  const matches = useQuery(api.matches.getMyMatches);

  if (matches === undefined) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-4 h-full">
        <div className="loading-spinner"></div>
        <p className="text-xl text-theme-text mt-4">Loading your matches...</p>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-4 h-full">
        <div className="text-5xl mb-4 text-theme-accent">💔</div>
        <h2 className="text-2xl font-bold text-theme-text mb-2">No Matches Yet</h2>
        <p className="text-md text-theme-text/80">
          Keep vibing to find your connections!
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-4 w-full max-w-2xl mx-auto">
      <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-theme-text text-center">
        Your Matches
      </h2>
      <div className="space-y-4 w-full">
        {matches.map((match) => (
          <MatchCard key={match.matchId} match={match} onStartChat={navigateToChat} />
        ))}
      </div>
    </div>
  );
};

export default MatchesScreen;
