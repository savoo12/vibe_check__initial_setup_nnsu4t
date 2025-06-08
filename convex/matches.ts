import { query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc, Id } from "./_generated/dataModel";
import { api } from "./_generated/api";

export type MatchedUserProfile = {
  profileId: Id<"userProfiles">;
  authUserId: Id<"users">;
  name?: string;
  bio?: string;
  profilePictureUrl?: string;
  currentMood?: string;
};

export type MatchData = {
  matchId: Id<"matches">;
  otherUser: MatchedUserProfile;
  conversationId?: Id<"conversations">;
  lastMessagePreview?: string; // For future use
  lastMessageTimestamp?: number; // For future use
  unreadCount?: number; // For future use
};

export const getMyMatches = query({
  handler: async (ctx): Promise<MatchData[]> => {
    const currentAuthUserId = await getAuthUserId(ctx);
    if (!currentAuthUserId) {
      return [];
    }

    // Find matches where the current user is either userAuthId1 or userAuthId2
    const matchesAsUser1 = await ctx.db
      .query("matches")
      .withIndex("by_user1", (q) => q.eq("userAuthId1", currentAuthUserId))
      .collect();

    const matchesAsUser2 = await ctx.db
      .query("matches")
      .withIndex("by_user2", (q) => q.eq("userAuthId2", currentAuthUserId))
      .collect();

    const allMatchDocs = [...matchesAsUser1, ...matchesAsUser2];
    // Deduplicate if a match somehow got queried twice (shouldn't happen with current schema)
    const uniqueMatchDocs = Array.from(new Map(allMatchDocs.map(doc => [doc._id, doc])).values());

    const matchesData: MatchData[] = [];

    for (const matchDoc of uniqueMatchDocs) {
      const otherUserAuthId =
        matchDoc.userAuthId1 === currentAuthUserId
          ? matchDoc.userAuthId2
          : matchDoc.userAuthId1;

      const otherUserProfile = await ctx.db
        .query("userProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", otherUserAuthId))
        .unique();

      if (otherUserProfile) {
        matchesData.push({
          matchId: matchDoc._id,
          otherUser: {
            profileId: otherUserProfile._id,
            authUserId: otherUserAuthId,
            name: otherUserProfile.name,
            bio: otherUserProfile.bio,
            profilePictureUrl: otherUserProfile.profilePictureUrl,
            currentMood: otherUserProfile.currentMood,
          },
          conversationId: matchDoc.conversationId,
          // lastMessagePreview, lastMessageTimestamp, unreadCount will be added later
        });
      }
    }

    // Sort matches, e.g., by creation time of the match (most recent first)
    // or by last message timestamp in the future.
    return matchesData.sort((a, b) => {
      const matchA = uniqueMatchDocs.find(m => m._id === a.matchId)!;
      const matchB = uniqueMatchDocs.find(m => m._id === b.matchId)!;
      return matchB._creationTime - matchA._creationTime;
    });
  },
});
