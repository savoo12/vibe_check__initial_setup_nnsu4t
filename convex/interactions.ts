import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api"; // No internal needed for this file based on current use
import { Id } from "./_generated/dataModel";

// Helper to ensure canonical order of user IDs
const getOrderedUserIds = (userId1: Id<"users">, userId2: Id<"users">): [Id<"users">, Id<"users">] => {
  return userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];
};

export const recordPass = mutation({
  args: { targetUserAuthId: v.id("users") },
  handler: async (ctx, args) => {
    const actingUserAuthId = await getAuthUserId(ctx);
    if (!actingUserAuthId) {
      throw new Error("User not authenticated");
    }
    if (actingUserAuthId === args.targetUserAuthId) {
      throw new Error("Cannot interact with yourself");
    }

    const existingInteraction = await ctx.db
      .query("userInteractions")
      .withIndex("by_acting_target", (q) => 
        q.eq("actingUserAuthId", actingUserAuthId).eq("targetUserAuthId", args.targetUserAuthId)
      )
      .first();

    if (existingInteraction && existingInteraction.interactionType === "pass") {
      return { status: "already_passed" };
    }
    // If it was a like, we could allow changing to pass, or just add a new pass interaction.
    // For simplicity, we'll just add the pass. UI should prevent spamming.

    await ctx.db.insert("userInteractions", {
      actingUserAuthId,
      targetUserAuthId: args.targetUserAuthId,
      interactionType: "pass",
    });
    return { status: "passed" };
  },
});

export const recordLike = mutation({
  args: { targetUserAuthId: v.id("users") },
  handler: async (ctx, args) => {
    const actingUserAuthId = await getAuthUserId(ctx);
    if (!actingUserAuthId) {
      throw new Error("User not authenticated");
    }
    if (actingUserAuthId === args.targetUserAuthId) {
      throw new Error("Cannot interact with yourself");
    }

    // Record the like interaction
    // Check if a 'like' from this user to target already exists
    const existingLike = await ctx.db
      .query("userInteractions")
      .withIndex("by_acting_type_target", q => 
        q.eq("actingUserAuthId", actingUserAuthId)
         .eq("interactionType", "like")
         .eq("targetUserAuthId", args.targetUserAuthId)
      ).first();

    if (!existingLike) {
      await ctx.db.insert("userInteractions", {
        actingUserAuthId,
        targetUserAuthId: args.targetUserAuthId,
        interactionType: "like",
      });
    }


    // Check for mutual like
    const mutualLike = await ctx.db
      .query("userInteractions")
      .withIndex("by_acting_type_target", (q) =>
        q
          .eq("actingUserAuthId", args.targetUserAuthId)
          .eq("interactionType", "like")
          .eq("targetUserAuthId", actingUserAuthId)
      )
      .first();

    if (mutualLike) {
      const [userAuthId1, userAuthId2] = getOrderedUserIds(actingUserAuthId, args.targetUserAuthId);
      
      let matchDoc = await ctx.db
        .query("matches")
        .withIndex("by_user_pair", q => q.eq("userAuthId1", userAuthId1).eq("userAuthId2", userAuthId2))
        .first();

      let conversationId = matchDoc?.conversationId;

      if (!matchDoc) {
        // Create conversation first
        const newConversationId = await ctx.db.insert("conversations", {
          participantAuthIds: [userAuthId1, userAuthId2],
          lastMessageTimestamp: Date.now(), // Initialize with current time
        });
        conversationId = newConversationId;

        // Then create match and link conversation
        const matchId = await ctx.db.insert("matches", {
          userAuthId1,
          userAuthId2,
          conversationId: newConversationId,
        });
        matchDoc = (await ctx.db.get(matchId))!; // Get the full match document
      } else if (!matchDoc.conversationId) {
        // Match exists but no conversationId, create and link
        const newConversationId = await ctx.db.insert("conversations", {
            participantAuthIds: [userAuthId1, userAuthId2],
            lastMessageTimestamp: Date.now(),
        });
        await ctx.db.patch(matchDoc._id, { conversationId: newConversationId });
        conversationId = newConversationId;
      }
      
      return { status: "matched", matchId: matchDoc._id, conversationId: conversationId };
    }

    return { status: "liked" };
  },
});
