import React, { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

interface ProfileSetupScreenProps {
  onProfileComplete: () => void;
}

const ProfileSetupScreen: React.FC<ProfileSetupScreenProps> = ({ onProfileComplete }) => {
  const userProfile = useQuery(api.users.getUserProfile);
  const updateProfile = useMutation(api.users.updateUserProfileDetails);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [profilePictureUrl, setProfilePictureUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name ?? "");
      setBio(userProfile.bio ?? "");
      setProfilePictureUrl(userProfile.profilePictureUrl ?? "");
    }
  }, [userProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!name.trim()) {
      setError("Name cannot be empty.");
      setIsLoading(false);
      return;
    }

    try {
      await updateProfile({
        name: name.trim(),
        bio: bio.trim(),
        profilePictureUrl: profilePictureUrl.trim(),
      });
      onProfileComplete();
    } catch (err) {
      console.error("Failed to update profile:", err);
      setError("Failed to save profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center text-center p-4 sm:p-8 w-full max-w-md mx-auto">
      <div className="content-card w-full"> {/* Wrap form in a card */}
        <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-theme-text">
          Tell us about yourself!
        </h2>
        <form onSubmit={handleSubmit} className="w-full space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-theme-text/80 text-left mb-1">
              Your Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What should we call you?"
              className="input-field" // Use new input style
              required
            />
          </div>
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-theme-text/80 text-left mb-1">
              Your Bio (optional)
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A little something about your vibe..."
              rows={3}
              className="input-field" // Use new input style
            />
          </div>
          <div>
            <label htmlFor="profilePictureUrl" className="block text-sm font-medium text-theme-text/80 text-left mb-1">
              Profile Picture URL (optional)
            </label>
            <input
              id="profilePictureUrl"
              type="url"
              value={profilePictureUrl}
              onChange={(e) => setProfilePictureUrl(e.target.value)}
              placeholder="Link to your awesome pic"
              className="input-field" // Use new input style
            />
            {profilePictureUrl && (
              <img src={profilePictureUrl} alt="Profile preview" className="mt-2 rounded-lg max-h-32 mx-auto" onError={(e) => e.currentTarget.style.display = 'none'} onLoad={(e) => e.currentTarget.style.display = 'block'} />
            )}
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>} {/* Standard error color */}
          <button
            type="submit"
            className="button-primary-highlight w-full text-lg py-3" // Use new button style
            disabled={isLoading}
          >
            {isLoading ? "Saving..." : "Save & Continue"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileSetupScreen;
