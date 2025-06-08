import React, { useState, useEffect, useRef, useCallback } from "react";
import { usePaginatedQuery, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc, Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

interface ChatScreenProps {
  conversationId: Id<"conversations">;
  otherUserName?: string;
  onBack: () => void;
}

const ChatScreen: React.FC<ChatScreenProps> = ({ conversationId, otherUserName, onBack }) => {
  const [newMessageText, setNewMessageText] = useState("");
  const sendMessageMutation = useMutation(api.messages.sendMessage);
  const updateTypingStatusMutation = useMutation(api.conversations.updateTypingStatus);
  const markAsReadMutation = useMutation(api.conversations.markAsRead);

  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isCurrentUserTypingState, setIsCurrentUserTypingState] = useState(false);

  const loggedInUser = useQuery(api.auth.loggedInUser);
  const selfAuthId = loggedInUser?._id;

  const conversationDetails = useQuery(api.conversations.get, conversationId ? { conversationId } : "skip");

  const {
    results: messages,
    status,
    loadMore,
    isLoading: isLoadingMessages,
  } = usePaginatedQuery(
    api.messages.listMessages,
    conversationId && selfAuthId ? { conversationId } : "skip", 
    { initialNumItems: 20 }
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    if (!conversationId || !selfAuthId) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    updateTypingStatusMutation({ conversationId, isTyping: isCurrentUserTypingState });

    if (isCurrentUserTypingState) {
      typingTimeoutRef.current = setTimeout(() => {
        // This will only set to false if the user hasn't typed again in 3s
        // The effect for isCurrentUserTypingState will then send the update.
        setIsCurrentUserTypingState(false); 
      }, 3000); 
    }
    
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Send a final "stopped typing" when component unmounts or conversationId/selfAuthId changes
      // only if the user was marked as typing.
      // This requires access to the latest isCurrentUserTypingState, which can be tricky in cleanup.
      // A ref to isCurrentUserTypingState might be needed or rely on backend to timeout old typing indicators.
      // For now, the backend timeout of 10s for typing indicators is the main guard.
    };
  }, [isCurrentUserTypingState, conversationId, selfAuthId, updateTypingStatusMutation]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newText = e.target.value;
    setNewMessageText(newText);
    if (newText.length > 0 && !isCurrentUserTypingState) {
      setIsCurrentUserTypingState(true);
    } else if (newText.length === 0 && isCurrentUserTypingState) {
      setIsCurrentUserTypingState(false);
    }
  };

  const scrollToBottom = useCallback((behavior: "auto" | "smooth" = "auto") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  },[]);

  useEffect(() => {
    if (messageContainerRef.current && messages.length > 0) {
        const { scrollTop, scrollHeight, clientHeight } = messageContainerRef.current;
        // If user is within 150px of the bottom, or it's the initial load (approximated by messages.length)
        if (scrollHeight - scrollTop - clientHeight < 250 || messages.length <= 20 ) { 
            scrollToBottom("smooth");
        }
    }
  }, [messages, scrollToBottom]);


  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessageText.trim() === "" || !conversationId || !selfAuthId) return;
    
    setIsSendingMessage(true);
    if (isCurrentUserTypingState) {
      setIsCurrentUserTypingState(false); 
    }

    try {
      await sendMessageMutation({
        conversationId: conversationId,
        text: newMessageText.trim(),
      });
      setNewMessageText("");
      inputRef.current?.focus(); // Refocus input after sending
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsSendingMessage(false);
    }
  };

  const otherParticipantId = conversationDetails?.participantAuthIds.find(id => id !== selfAuthId);
  const otherUserTypingInfo = conversationDetails?.typing?.find(t => t.userId === otherParticipantId);
  const isOtherUserTyping = otherUserTypingInfo && (Date.now() - otherUserTypingInfo.lastTyped < 5000);

  const otherUserLastSeenInfo = conversationDetails?.lastSeenByParticipants?.find(p => p.userId === otherParticipantId);
  
  useEffect(() => {
    if (!selfAuthId || !conversationId || !messageContainerRef.current || messages.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let latestVisibleUnreadMessageId: Id<"messages"> | null = null;
        let latestVisibleUnreadMessageTime = 0;

        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const messageElement = entry.target as HTMLElement;
            const messageId = messageElement.dataset.messageId as Id<"messages"> | undefined;
            const messageAuthorId = messageElement.dataset.messageAuthor as Id<"users"> | undefined;
            const messageCreationTime = parseInt(messageElement.dataset.creationTime || "0", 10);

            if (messageId && messageAuthorId && messageAuthorId !== selfAuthId && messageCreationTime > 0) {
              if (messageCreationTime > latestVisibleUnreadMessageTime) {
                latestVisibleUnreadMessageTime = messageCreationTime;
                latestVisibleUnreadMessageId = messageId;
              }
            }
          }
        });

        if (latestVisibleUnreadMessageId) {
            const currentUserSeenDetails = conversationDetails?.lastSeenByParticipants?.find(p => p.userId === selfAuthId);
            let lastMarkedMessageTime = 0;
            if (currentUserSeenDetails) {
                const lastMarkedMsg = messages.find(m => m._id === currentUserSeenDetails.messageId); // Check current page
                if (lastMarkedMsg) {
                    lastMarkedMessageTime = lastMarkedMsg._creationTime;
                } else if (currentUserSeenDetails.timestamp) { 
                    // Fallback if message not on current page, use stored timestamp of last seen message
                    // This requires ensuring timestamp in lastSeenByParticipants is message creation time
                    // For now, we'll assume if message not found, it's older or on another page.
                    // A more robust solution might involve storing creationTime with lastSeen.
                    // For simplicity, if not found on page, assume it's older.
                }
            }
            if (latestVisibleUnreadMessageTime > lastMarkedMessageTime) {
                markAsReadMutation({ conversationId, lastReadMessageId: latestVisibleUnreadMessageId });
            }
        }
      },
      { threshold: 0.8, root: messageContainerRef.current } 
    );

    const messageElements = messageContainerRef.current?.querySelectorAll(".message-item");
    if (messageElements) {
      messageElements.forEach(el => observer.observe(el));
    }
    return () => observer.disconnect();
  }, [messages, markAsReadMutation, conversationId, selfAuthId, conversationDetails]);


  if (!selfAuthId || (conversationId && conversationDetails === undefined && messages === undefined && status !== "CanLoadMore" && status !== "Exhausted")) {
    return (
      <div className="flex flex-col h-full w-full max-w-2xl mx-auto bg-theme-primary shadow-lg rounded-lg items-center justify-center">
        <div className="loading-spinner"></div>
        <p className="text-theme-text mt-2">Loading chat...</p>
      </div>
    );
  }
  
  if (conversationId && conversationDetails === null && status === "Exhausted" && messages.length === 0) {
    return (
         <div className="flex flex-col h-full w-full max-w-2xl mx-auto bg-theme-primary shadow-lg rounded-lg items-center justify-center">
            <p className="text-theme-text/80">Conversation not found or you're not a participant.</p>
            <button onClick={onBack} className="button-primary mt-4">Go Back</button>
        </div>
    )
  }


  return (
    <div className="flex flex-col h-full w-full max-w-2xl mx-auto bg-theme-primary shadow-lg rounded-lg">
      <header className="bg-theme-secondary p-4 text-theme-text shadow-subtle rounded-t-lg flex items-center sticky top-0 z-10">
        <button onClick={onBack} className="mr-3 p-1 rounded-full hover:bg-theme-accent/20 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <div className="flex flex-col">
          <h2 className="text-xl font-semibold">{otherUserName || "Chat"}</h2>
          {isOtherUserTyping && <p className="text-xs text-theme-highlight animate-pulse">typing...</p>}
        </div>
      </header>

      <div ref={messageContainerRef} className="flex-1 p-4 overflow-y-auto space-y-3">
        {status === "LoadingFirstPage" && messages.length === 0 && (
          <div className="flex justify-center items-center h-full">
            <div className="loading-spinner"></div>
          </div>
        )}
        {status === "CanLoadMore" && (
           <button
            onClick={() => loadMore(15)}
            disabled={isLoadingMessages}
            className="button-subtle text-sm mx-auto block my-2 disabled:opacity-50"
          >
            {isLoadingMessages ? "Loading..." : "Load older messages"}
          </button>
        )}
         {status === "Exhausted" && messages.length > 0 && (
            <p className="text-center text-sm text-theme-text/60 my-2">Beginning of chat</p>
        )}
         {status === "Exhausted" && messages.length === 0 && (
            <p className="text-center text-sm text-theme-text/60 my-4">No messages yet. Start the conversation!</p>
        )}


        {messages.map((msg: Doc<"messages">) => {
          const isMyMessage = msg.authorAuthId === selfAuthId;
          let isReadByOther = false;
          if (isMyMessage && otherUserLastSeenInfo) {
            // Check if the other user's last seen message ID is this message or a newer one
            // This requires comparing creation times if IDs are not strictly sequential
            const otherSeenMessageInPage = messages.find(m => m._id === otherUserLastSeenInfo.messageId);
            if (otherSeenMessageInPage) {
                if (msg._creationTime <= otherSeenMessageInPage._creationTime) {
                    isReadByOther = true;
                }
            } else if (otherUserLastSeenInfo.timestamp >= msg._creationTime) {
                // Fallback: if the other user's last seen timestamp is after this message was created
                isReadByOther = true;
            }
          }

          return (
            <div
              key={msg._id}
              data-message-id={msg._id}
              data-message-author={msg.authorAuthId}
              data-creation-time={msg._creationTime}
              className={`message-item flex ${isMyMessage ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-3 py-2 rounded-xl shadow-subtle ${ // Adjusted padding & rounding
                  isMyMessage
                    ? "bg-theme-accent text-theme-text rounded-br-none"
                    : "bg-theme-secondary text-theme-text rounded-bl-none"
                }`}
              >
                <p className="text-sm break-words whitespace-pre-wrap">{msg.text}</p>
                <div className="flex items-center mt-1 ${isMyMessage ? 'justify-end' : 'justify-start'}">
                    <p className={`text-xs text-theme-text/60 mr-1`}>
                    {new Date(msg._creationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {isMyMessage && (
                        <span className={`text-xs ${isReadByOther ? 'text-blue-500' : 'text-theme-text/60'}`}>✓✓</span>
                    )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="bg-theme-secondary p-3 sm:p-4 border-t border-theme-accent/20 rounded-b-lg flex items-center gap-2 sm:gap-3 sticky bottom-0 z-10">
        <input
          ref={inputRef}
          type="text"
          value={newMessageText}
          onChange={handleInputChange}
          onBlur={() => { 
            // Delay setting to false to allow click on send button
            setTimeout(() => {
              if (document.activeElement !== inputRef.current) {
                 setIsCurrentUserTypingState(false);
              }
            }, 100);
          }}
          placeholder="Type your vibe..."
          className="input-field flex-1 py-2"
          disabled={isSendingMessage}
          autoFocus
        />
        <button
          type="submit"
          className="button-primary-highlight px-4 sm:px-6 py-2 text-sm sm:text-base shrink-0"
          disabled={!newMessageText.trim() || isSendingMessage}
        >
          {isSendingMessage ? <span className="loading-spinner-sm !border-theme-primary !h-4 !w-4 inline-block"></span> : "Send"}
        </button>
      </form>
    </div>
  );
};

export default ChatScreen;
