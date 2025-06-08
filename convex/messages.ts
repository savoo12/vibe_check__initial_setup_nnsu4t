import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc, Id } from "./_generated/dataModel";
import { paginationOptsValidator } from "convex/server";

export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const authorAuthId = await getAuthUserId(ctx);
    if (!authorAuthId) {
      throw new Error("User not authenticated");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    if (!conversation.participantAuthIds.includes(authorAuthId)) {
      throw new Error("User is not part of this conversation");
    }

    if (args.text.trim().length === 0) {
      throw new Error("Message cannot be empty");
    }
    if (args.text.length > 1000) { 
        throw new Error("Message is too long");
    }

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      authorAuthId,
      text: args.text,
    });

    let currentTyping = conversation.typing ?? [];
    currentTyping = currentTyping.filter(t => t.userId !== authorAuthId);
    
    await ctx.db.patch(args.conversationId, {
      lastMessageTimestamp: Date.now(),
      typing: currentTyping,
    });

    // Also mark this message as read by the sender automatically
    let lastSeenByParticipants = conversation.lastSeenByParticipants ?? [];
    const userEntryIndex = lastSeenByParticipants.findIndex(p => p.userId === authorAuthId);
    const newEntry = { userId: authorAuthId, messageId, timestamp: Date.now() };
    if (userEntryIndex !== -1) {
      lastSeenByParticipants[userEntryIndex] = newEntry;
    } else {
      lastSeenByParticipants.push(newEntry);
    }
    await ctx.db.patch(args.conversationId, { lastSeenByParticipants });


    return { success: true, messageId };
  },
});

export const listMessages = query({
  args: {
    conversationId: v.id("conversations"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const currentAuthUserId = await getAuthUserId(ctx);
    if (!currentAuthUserId) {
      return { page: [], isDone: true, continueCursor: "" }; // Return empty for non-auth
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      return { page: [], isDone: true, continueCursor: "" }; // Return empty if no convo
    }
    if (!conversation.participantAuthIds.includes(currentAuthUserId)) {
      return { page: [], isDone: true, continueCursor: "" }; // Return empty if not part of convo
    }

    const messagesResults = await ctx.db
      .query("messages")
      .withIndex("by_conversation_for_chat", (q) => q.eq("conversationId", args.conversationId))
      .order("desc") 
      .paginate(args.paginationOpts);
    
    return {
        ...messagesResults,
        page: messagesResults.page.reverse(),
    };
  },
});
