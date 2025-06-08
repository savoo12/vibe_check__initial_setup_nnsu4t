"use strict";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

export const get = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const currentAuthUserId = await getAuthUserId(ctx);
    if (!currentAuthUserId) {
      // This query should only be called when a user is logged in and part of the convo.
      // Consider returning null or an explicit error if called inappropriately.
      return null; 
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      // console.warn(`Conversation not found: ${args.conversationId}`);
      return null;
    }

    if (!conversation.participantAuthIds.includes(currentAuthUserId)) {
      // console.warn(`User ${currentAuthUserId} not part of conversation ${args.conversationId}`);
      return null; // Or throw error if this state is unexpected
    }
    return conversation;
  },
});

export const updateTypingStatus = mutation({
  args: {
    conversationId: v.id("conversations"),
    isTyping: v.boolean(),
  },
  handler: async (ctx, args) => {
    const currentAuthUserId = await getAuthUserId(ctx);
    if (!currentAuthUserId) {
      throw new Error("User not authenticated");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      // Don't throw, just return if convo deleted mid-typing
      return { success: false, error: "Conversation not found" };
    }
    if (!conversation.participantAuthIds.includes(currentAuthUserId)) {
      return { success: false, error: "User not part of this conversation" };
    }

    let currentTyping = conversation.typing ?? [];
    // Filter out very old typing indicators (e.g., older than 10 seconds)
    currentTyping = currentTyping.filter(t => Date.now() - t.lastTyped < 10000);

    if (args.isTyping) {
      const existingTypingUser = currentTyping.find(t => t.userId === currentAuthUserId);
      if (existingTypingUser) {
        existingTypingUser.lastTyped = Date.now();
      } else {
        currentTyping.push({ userId: currentAuthUserId, lastTyped: Date.now() });
      }
    } else {
      currentTyping = currentTyping.filter(t => t.userId !== currentAuthUserId);
    }

    await ctx.db.patch(args.conversationId, { typing: currentTyping });
    return { success: true };
  },
});

export const markAsRead = mutation({
  args: {
    conversationId: v.id("conversations"),
    lastReadMessageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const currentAuthUserId = await getAuthUserId(ctx);
    if (!currentAuthUserId) {
      throw new Error("User not authenticated");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      return { success: false, error: "Conversation not found" };
    }
    if (!conversation.participantAuthIds.includes(currentAuthUserId)) {
      return { success: false, error: "User not part of this conversation" };
    }
    
    const messageToMark = await ctx.db.get(args.lastReadMessageId);
    if (!messageToMark) {
        // console.warn(`Message with ID ${args.lastReadMessageId} not found for marking as read.`);
        return { success: false, error: "Message not found" };
    }
    // Ensure the message belongs to the conversation we are marking
    if (messageToMark.conversationId !== args.conversationId) {
        // console.warn(`Message ${args.lastReadMessageId} does not belong to conversation ${args.conversationId}`);
        return { success: false, error: "Message does not belong to this conversation" };
    }

    let lastSeenByParticipants = conversation.lastSeenByParticipants ?? [];
    const userEntryIndex = lastSeenByParticipants.findIndex(p => p.userId === currentAuthUserId);

    const newEntry = {
      userId: currentAuthUserId,
      messageId: args.lastReadMessageId,
      timestamp: Date.now(), 
    };

    if (userEntryIndex !== -1) {
      const existingEntry = lastSeenByParticipants[userEntryIndex];
      // Avoid DB read if possible: if new messageId is same, just update timestamp
      if (existingEntry.messageId === args.lastReadMessageId) {
        lastSeenByParticipants[userEntryIndex].timestamp = Math.max(existingEntry.timestamp, newEntry.timestamp);
      } else {
        // If messageId is different, we need to compare creation times
        const existingMessage = await ctx.db.get(existingEntry.messageId);
        // Only update if the new message is actually newer (based on creation time)
        if (existingMessage && messageToMark._creationTime > existingMessage._creationTime) {
           lastSeenByParticipants[userEntryIndex] = newEntry;
        } else if (!existingMessage) { // If the old "seen" message was deleted
           lastSeenByParticipants[userEntryIndex] = newEntry;
        }
        // If messageToMark is older or same age as existingMessage, do nothing.
      }
    } else {
      lastSeenByParticipants.push(newEntry);
    }

    await ctx.db.patch(args.conversationId, { lastSeenByParticipants });
    return { success: true };
  },
});
