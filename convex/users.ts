import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api, internal } from "./_generated/api"; // Ensure internal is imported if used
import { Doc, Id } from "./_generated/dataModel";

type UserProfileData = Doc<"userProfiles"> & { email?: string | null } | null;

// For getPotentialMatches, we'll define a specific return type for clarity
export type PotentialMatchUserData = Omit<Doc<"userProfiles">, "userId"> & {
  _id: Id<"userProfiles">; // This is the userProfile document ID
  targetAuthId: Id<"users">; // This is the auth user ID (users._id) of the potential match
};


export const ensureUserProfile = mutation({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (existingProfile) {
      if (!existingProfile.currentMood) {
        await ctx.db.patch(existingProfile._id, { currentMood: "Chill" });
      }
      return existingProfile._id;
    }

    const userAuthData = await ctx.db.get(userId);
    return await ctx.db.insert("userProfiles", {
      userId: userId,
      name: userAuthData?.name ?? undefined,
      currentMood: "Chill", // Default mood for new profiles
    });
  },
});

export const updateUserMood = mutation({
  args: { mood: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("User not authenticated");
    const userProfile = await ctx.db.query("userProfiles").withIndex("by_userId", (q) => q.eq("userId", userId)).unique();
    if (!userProfile) throw new Error("User profile not found.");
    await ctx.db.patch(userProfile._id, { currentMood: args.mood });
    return { success: true, mood: args.mood };
  },
});

export const updateUserProfileDetails = mutation({
  args: {
    name: v.optional(v.string()),
    bio: v.optional(v.string()),
    profilePictureUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("User not authenticated");
    const userProfileDoc = await ctx.db.query("userProfiles").withIndex("by_userId", (q) => q.eq("userId", userId)).unique();
    if (!userProfileDoc) throw new Error("User profile not found.");
    
    const updatePayload: Partial<Doc<"userProfiles">> = {};
    if (args.name !== undefined) updatePayload.name = args.name;
    if (args.bio !== undefined) updatePayload.bio = args.bio;
    if (args.profilePictureUrl !== undefined) updatePayload.profilePictureUrl = args.profilePictureUrl;

    if (Object.keys(updatePayload).length > 0) {
      await ctx.db.patch(userProfileDoc._id, updatePayload);
    }
    return { success: true };
  },
});

export const getUserProfile = query({
  handler: async (ctx): Promise<UserProfileData> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const profile = await ctx.db.query("userProfiles").withIndex("by_userId", (q) => q.eq("userId", userId)).unique();
    if (!profile) return null;
    const authUser = await ctx.db.get(userId);
    return { ...profile, email: authUser?.email };
  },
});

export const getCurrentUserVibe = query({
  handler: async (ctx): Promise<string | null> => {
    const userProfile: UserProfileData = await ctx.runQuery(api.users.getUserProfile);
    return userProfile?.currentMood ?? null;
  },
});

export const getPotentialMatches = query({
  handler: async (ctx): Promise<PotentialMatchUserData[]> => {
    const currentAuthUserId = await getAuthUserId(ctx);
    if (!currentAuthUserId) return [];

    const currentUserProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", currentAuthUserId))
      .unique();

    if (!currentUserProfile || !currentUserProfile.currentMood) {
      return []; // No matches if current user's profile or mood isn't set
    }

    // Get users current user has already interacted with
    const interactions = await ctx.db
      .query("userInteractions")
      .withIndex("by_acting_target", (q) => q.eq("actingUserAuthId", currentAuthUserId)) // Query all interactions by current user
      .collect();
    const interactedUserAuthIds = new Set(interactions.map(i => i.targetUserAuthId));

    const allUserProfilesWithMood = await ctx.db
      .query("userProfiles")
      // .withIndex("by_mood", q => q.eq("currentMood", currentUserProfile.currentMood)) // Future: index by mood for performance
      .filter(q => q.neq(q.field("userId"), currentAuthUserId)) // Exclude current user
      .filter(q => q.neq(q.field("currentMood"), undefined)) // Ensure they have a mood
      .filter(q => q.neq(q.field("name"), undefined)) // Ensure they have a name (profile setup complete)
      .collect(); // Collect all potential profiles first

    // Filter out interacted users and map to PotentialMatchUserData
    const potentialMatches: PotentialMatchUserData[] = allUserProfilesWithMood
      .filter(profile => !interactedUserAuthIds.has(profile.userId)) // Exclude interacted users
      .map(profileDoc => {
        const { userId, ...rest } = profileDoc;
        return { ...rest, targetAuthId: userId };
      });
      
    // Simple filter for users with the same mood, can be more complex later
    let matches = potentialMatches.filter(user => user.currentMood === currentUserProfile.currentMood);

    if (matches.length < 10) {
      // If not enough same-mood matches, supplement with other users who have a mood and name
      const otherUsers = potentialMatches
        .filter(user => user.currentMood !== currentUserProfile.currentMood && !matches.some(m => m._id === user._id))
        .slice(0, 10 - matches.length);
      matches.push(...otherUsers);
    }
    
    return matches.slice(0, 10); // Limit total results
  },
});
