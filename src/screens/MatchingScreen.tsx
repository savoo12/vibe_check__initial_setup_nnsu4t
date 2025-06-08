import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import UserProfileCard from "../components/UserProfileCard";
import { PotentialMatchUserData } from "../../convex/users";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

// Sample data for UI demonstration if no real matches are found
const SAMPLE_MATCHES: PotentialMatchUserData[] = [
  { _id: "sampleProfile1" as Id<"userProfiles">, targetAuthId: "sampleAuth1" as Id<"users">, name: "Alex V.", bio: "Loves hiking and coding. Looking for chill vibes.", profilePictureUrl: "https://source.unsplash.com/random/400x400?person,smile", currentMood: "Chill", _creationTime: Date.now() - 100000 },
  { _id: "sampleProfile2" as Id<"userProfiles">, targetAuthId: "sampleAuth2" as Id<"users">, name: "Jamie S.", bio: "Musician and artist. Always energetic!", profilePictureUrl: "https://source.unsplash.com/random/400x400?person,happy", currentMood: "Energetic", _creationTime: Date.now() - 200000 },
];


const MatchingScreen: React.FC = () => {
  const potentialMatchesData = useQuery(api.users.getPotentialMatches);
  const recordPassMutation = useMutation(api.interactions.recordPass);
  const recordLikeMutation = useMutation(api.interactions.recordLike);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoadingInteraction, setIsLoadingInteraction] = useState(false);
  const [displayedMatches, setDisplayedMatches] = useState<PotentialMatchUserData[]>(SAMPLE_MATCHES);

  useEffect(() => {
    if (potentialMatchesData !== undefined) {
      setDisplayedMatches(potentialMatchesData.length > 0 ? potentialMatchesData : []);
      setCurrentIndex(0);
    }
  }, [potentialMatchesData]);

  const advanceToNextCard = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1)); // Simpler advance, handle end of list in render
  };

  const handlePass = async () => {
    if (isLoadingInteraction || !displayedMatches[currentIndex]) return;
    setIsLoadingInteraction(true);
    const targetUserAuthId = displayedMatches[currentIndex].targetAuthId;
    try {
      await recordPassMutation({ targetUserAuthId });
      toast.info(`Passed on ${displayedMatches[currentIndex].name}`);
      advanceToNextCard();
    } catch (error) {
      console.error("Failed to record pass:", error);
      toast.error("Could not record pass.");
    } finally {
      setIsLoadingInteraction(false);
    }
  };

  const handleConnect = async () => {
    if (isLoadingInteraction || !displayedMatches[currentIndex]) return;
    setIsLoadingInteraction(true);
    const { targetAuthId, name } = displayedMatches[currentIndex];
    try {
      const result = await recordLikeMutation({ targetUserAuthId: targetAuthId });
      if (result.status === "matched") {
        toast.success(`It's a Vibe! You matched with ${name}!`);
      } else {
        toast.success(`You liked ${name}! Let's see if it's mutual.`);
      }
      advanceToNextCard();
    } catch (error) {
      console.error("Failed to record like:", error);
      toast.error("Could not record like.");
    } finally {
      setIsLoadingInteraction(false);
    }
  };
  
  if (potentialMatchesData === undefined) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-4 h-full">
        <div className="loading-spinner"></div>
        <p className="text-xl text-theme-text">Finding vibes...</p>
      </div>
    );
  }

  if (displayedMatches.length === 0 || currentIndex >= displayedMatches.length || !displayedMatches[currentIndex]) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-4 h-full">
        <div className="text-6xl mb-4 text-theme-accent">🤷‍♀️</div>
        <h2 className="text-3xl font-bold text-theme-text mb-2">No New Vibes Right Now</h2>
        <p className="text-lg text-theme-text/80">Check back later or try changing your mood!</p>
      </div>
    );
  }
  
  const currentUserCard = displayedMatches[currentIndex];

  return (
    <div className="flex flex-col items-center justify-center p-4 w-full h-full">
      <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-theme-text text-center">
        Discover New Vibes
      </h2>
      <div className="w-full max-w-sm">
          <UserProfileCard 
            user={currentUserCard}
            onPass={handlePass}
            onConnect={handleConnect}
            key={currentUserCard._id} 
          />
      </div>
      {displayedMatches.length > 1 && (
        <p className="text-sm text-theme-text/70 mt-4">
          Showing {Math.min(currentIndex + 1, displayedMatches.length)} of {displayedMatches.length}
        </p>
      )}
      {isLoadingInteraction && (
        <div className="absolute inset-0 bg-theme-primary/30 backdrop-blur-sm flex items-center justify-center z-30">
            <div className="loading-spinner-sm"></div>
        </div>
      )}
    </div>
  );
};

export default MatchingScreen;
