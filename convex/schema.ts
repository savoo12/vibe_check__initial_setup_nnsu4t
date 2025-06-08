import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  // --- User Profiles ---
  userProfiles: defineTable({
    userId: v.id("users"), // Links to auth user table
    name: v.optional(v.string()),
    bio: v.optional(v.string()),
    profilePictureUrl: v.optional(v.string()),
    currentMood: v.optional(v.string()), // e.g., "Happy", "Chill"
  })
    .index("by_userId", ["userId"])
    .index("by_mood", ["currentMood"]),

  // --- User Interactions (Likes/Passes) ---
  userInteractions: defineTable({
    actingUserAuthId: v.id("users"),
    targetUserAuthId: v.id("users"),
    interactionType: v.union(v.literal("like"), v.literal("pass")),
  })
    .index("by_acting_target", ["actingUserAuthId", "targetUserAuthId"])
    .index("by_acting_type_target", ["actingUserAuthId", "interactionType", "targetUserAuthId"]),

  // --- Matches ---
  matches: defineTable({
    userAuthId1: v.id("users"), 
    userAuthId2: v.id("users"),
    conversationId: v.optional(v.id("conversations")),
  })
    .index("by_user_pair", ["userAuthId1", "userAuthId2"])
    .index("by_user1", ["userAuthId1"])
    .index("by_user2", ["userAuthId2"]),

  // --- Conversations ---
  conversations: defineTable({
    participantAuthIds: v.array(v.id("users")),
    lastMessageTimestamp: v.optional(v.number()),
    typing: v.optional(v.array(v.object({ userId: v.id("users"), lastTyped: v.number() }))),
    lastSeenByParticipants: v.optional(v.array(v.object({
      userId: v.id("users"),
      messageId: v.id("messages"),
      timestamp: v.number(),
    }))),
  })
    .index("by_participant", ["participantAuthIds"])
    .index("by_lastMessageTimestamp", ["lastMessageTimestamp"]),

  // --- Messages ---
  messages: defineTable({
    conversationId: v.id("conversations"),
    authorAuthId: v.id("users"),
    text: v.string(),
  })
    .index("by_conversation_for_chat", ["conversationId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
