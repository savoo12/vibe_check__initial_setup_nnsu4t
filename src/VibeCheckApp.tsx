import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import OnboardingScreen from "./screens/OnboardingScreen";
import MoodSelectionScreen from "./screens/MoodSelectionScreen";
import ProfileSetupScreen from "./screens/ProfileSetupScreen";
import MatchingScreen from "./screens/MatchingScreen";
import MatchesScreen from "./screens/MatchesScreen";
import ChatScreen from "./screens/ChatScreen"; 
import { SignOutButton } from "./SignOutButton";
import { MOOD_DETAILS } from "./moods";
import { Id } from "../convex/_generated/dataModel";

// Icons for navigation
const MatchingIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>;
const ChatIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>;
const ProfileIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;

type AppScreen = 
  | "onboarding" 
  | "profileSetup" 
  | "moodSelection" 
  | "matching" 
  | "matchesList" 
  | "chat" 
  | "profileView";

interface ChatScreenParams {
  conversationId: Id<"conversations">;
  otherUserName?: string;
}

export default function VibeCheckApp() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>("matching");
  const [chatParams, setChatParams] = useState<ChatScreenParams | null>(null);
  
  const userProfile = useQuery(api.users.getUserProfile);
  const ensureProfile = useMutation(api.users.ensureUserProfile);
  const updateUserMood = useMutation(api.users.updateUserMood);
  // loggedInUser query is used within ChatScreen itself now
  // const loggedInUser = useQuery(api.auth.loggedInUser); 

  useEffect(() => {
    if (userProfile === undefined) return;

    if (userProfile === null) {
      ensureProfile().then(() => setCurrentScreen("onboarding"));
      return;
    }

    if (!userProfile.name || !userProfile.bio) {
      setCurrentScreen("profileSetup");
    } else if (!userProfile.currentMood) {
      setCurrentScreen("moodSelection");
    } else {
      if (["onboarding", "profileSetup", "moodSelection"].includes(currentScreen) && currentScreen !== "chat") {
         setCurrentScreen("matching");
      }
    }
  }, [userProfile, ensureProfile, currentScreen]);

  const handleNavigateToChat = (conversationId: Id<"conversations">, otherUserName?: string) => {
    setChatParams({ conversationId, otherUserName });
    setCurrentScreen("chat");
  };

  const handleBackFromChat = () => {
    setCurrentScreen("matchesList"); 
    setChatParams(null);
  };


  const handleMoodSelected = async (moodName: string) => {
    if (!userProfile?._id) return; // Should not happen if profile exists
    try {
      await updateUserMood({ mood: moodName });
      if (userProfile.name && userProfile.bio) { // Check again as profile might be minimal
        setCurrentScreen("matching");
      } else {
        setCurrentScreen("profileSetup");
      }
    } catch (error) { console.error("Failed to update mood:", error); }
  };

  const handleProfileComplete = () => {
    if (!userProfile?.currentMood) setCurrentScreen("moodSelection");
    else setCurrentScreen("matching");
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case "onboarding":
        return <OnboardingScreen onComplete={() => {
          if (userProfile && (!userProfile.name || !userProfile.bio)) setCurrentScreen("profileSetup");
          else if (userProfile && !userProfile.currentMood) setCurrentScreen("moodSelection");
          else if (userProfile) setCurrentScreen("matching");
          else setCurrentScreen("profileSetup"); // Fallback if userProfile somehow null after ensure
        }} />;
      case "profileSetup":
        return <ProfileSetupScreen onProfileComplete={handleProfileComplete} />;
      case "moodSelection":
        return <MoodSelectionScreen moods={MOOD_DETAILS} onMoodSelect={handleMoodSelected} currentUserMood={userProfile?.currentMood} />;
      case "matching":
        return <MatchingScreen />;
      case "matchesList":
        return <MatchesScreen navigateToChat={handleNavigateToChat} />;
      case "chat":
        if (chatParams) { // Removed loggedInUser?._id check here as ChatScreen handles its auth state
          return <ChatScreen 
                    conversationId={chatParams.conversationId} 
                    otherUserName={chatParams.otherUserName}
                    // currentAuthUserId prop removed
                    onBack={handleBackFromChat} 
                 />;
        }
        // Fallback if params not set, though UI flow should prevent this
        setCurrentScreen("matchesList"); 
        return <MatchesScreen navigateToChat={handleNavigateToChat} />; 
      default:
        return <MatchingScreen />;
    }
  };

  if (userProfile === undefined) { // Simplified loading state
    return (
      <div className="min-h-screen flex items-center justify-center bg-theme-primary">
        <div className="loading-spinner"></div>
        <p className="text-theme-text ml-4 text-xl">Loading your vibe...</p>
      </div>
    );
  }

  const NavButton: React.FC<{ screen: AppScreen; label: string; icon: React.ReactNode; }> = ({ screen, label, icon }) => (
    <button
      onClick={() => {
        if (currentScreen === "chat" && screen !== "chat") setChatParams(null); 
        setCurrentScreen(screen);
      }}
      className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors w-20
                  ${currentScreen === screen ? 'text-theme-highlight' : 'text-theme-text/70 hover:text-theme-text'}`}
      aria-label={label}
    >
      {icon}
      <span className="text-xs mt-1">{label}</span>
    </button>
  );

  const showNavBar = userProfile && userProfile.name && userProfile.bio && userProfile.currentMood && currentScreen !== "chat";

  return (
    <div className="min-h-screen flex flex-col bg-theme-primary text-theme-text">
      <header className={`sticky top-0 z-20 bg-theme-secondary/90 backdrop-blur-sm h-16 flex justify-between items-center shadow-subtle px-4 sm:px-8 ${currentScreen === 'chat' ? 'hidden sm:flex' : ''}`}>
        <h1 className="text-2xl font-bold text-theme-text">Vibe Check</h1>
        <div className="flex items-center gap-2 sm:gap-4">
          {userProfile && <p className="text-sm hidden sm:block text-theme-text/90">{(userProfile.name || userProfile.email)?.split('@')[0] ?? "Viber"}</p>}
          <SignOutButton />
        </div>
      </header>
      
      <main className={`flex-1 flex flex-col items-center justify-start overflow-y-auto 
                      ${currentScreen === 'chat' ? 'p-0 h-[calc(100vh-4rem)] sm:h-auto' : 'pt-4 sm:pt-8 pb-20 sm:pb-24 px-2 sm:px-4'}`}>
        {renderScreen()}
      </main>

      {showNavBar && (
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-theme-secondary/90 backdrop-blur-sm shadow-subtle border-t border-theme-accent/20 flex justify-around items-center z-20">
          <NavButton screen="matching" label="Discover" icon={<MatchingIcon />} />
          <NavButton screen="matchesList" label="Matches" icon={<ChatIcon />} />
          <NavButton screen="moodSelection" label="My Vibe" icon={<ProfileIcon />} />
        </nav>
      )}
    </div>
  );
}
