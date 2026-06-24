import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";

const EMOJIS = ["❤️", "😂", "😮", "😢", "😡", "👍"];

const MessageStatus = ({ status }) => {
  if (status === "read") {
    return <span className="text-blue-400 text-xs">✓✓</span>;
  } else if (status === "delivered") {
    return <span className="text-gray-400 text-xs">✓✓</span>;
  } else {
    return <span className="text-gray-400 text-xs">✓</span>;
  }
};

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
    markMessagesRead,
    deleteMessage,
    reactToMessage,
  } = useChatStore();
  const { authUser, socket } = useAuthStore();
  const messageEndRef = useRef(null);
  const [isTyping, setIsTyping] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [emojiPicker, setEmojiPicker] = useState(null); // { messageId, x, y }

  useEffect(() => {
    getMessages(selectedUser._id);
    subscribeToMessages();
    return () => unsubscribeFromMessages();
  }, [selectedUser._id, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
    if (selectedUser._id) {
      markMessagesRead(selectedUser._id);
    }
  }, [messages, selectedUser._id]);

  useEffect(() => {
    if (!socket) return;

    socket.on("typing", ({ senderId }) => {
      if (senderId === selectedUser._id) setIsTyping(true);
    });

    socket.on("stopTyping", ({ senderId }) => {
      if (senderId === selectedUser._id) setIsTyping(false);
    });

    return () => {
      socket.off("typing");
      socket.off("stopTyping");
    };
  }, [socket, selectedUser._id]);

  useEffect(() => {
    const handleClick = () => {
      setContextMenu(null);
      setEmojiPicker(null);
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const handleRightClick = (e, message) => {
    e.preventDefault();
    setEmojiPicker(null);
    setContextMenu({
      messageId: message._id,
      x: e.clientX,
      y: e.clientY,
      isSender: message.senderId === authUser._id,
    });
  };

  const handleDelete = async (deleteForEveryone) => {
    if (contextMenu) {
      await deleteMessage(contextMenu.messageId, deleteForEveryone);
      setContextMenu(null);
    }
  };

  const handleReact = async (emoji) => {
    if (emojiPicker) {
      await reactToMessage(emojiPicker.messageId, emoji);
      setEmojiPicker(null);
    }
  };

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message._id}
            className={`chat ${message.senderId === authUser._id ? "chat-end" : "chat-start"}`}
            onContextMenu={(e) => handleRightClick(e, message)}
          >
            <div className="chat-image avatar">
              <div className="size-10 rounded-full border">
                <img
                  src={
                    message.senderId === authUser._id
                      ? authUser.profilePic || "/avatar.png"
                      : selectedUser.profilePic || "/avatar.png"
                  }
                  alt="profile pic"
                />
              </div>
            </div>
            <div className="chat-header mb-1">
              <time className="text-xs opacity-50 ml-1">
                {formatMessageTime(message.createdAt)}
              </time>
            </div>
            <div className={`chat-bubble flex flex-col relative group ${message.deletedForEveryone ? "opacity-50 italic" : ""}`}>
              {message.deletedForEveryone ? (
                <p className="text-sm">🚫 This message was deleted</p>
              ) : (
                <>
                  {message.image && (
                    <img
                      src={message.image}
                      alt="Attachment"
                      className="sm:max-w-[200px] rounded-md mb-2"
                    />
                  )}
                  {message.text && <p>{message.text}</p>}

                  {/* Emoji react button - shows on hover */}
                  {!message.deletedForEveryone && (
                    <button
                      className="absolute -top-3 -right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-base-200 rounded-full w-6 h-6 flex items-center justify-center text-xs shadow"
                      onClick={(e) => {
                        e.stopPropagation();
                        setContextMenu(null);
                        setEmojiPicker({ messageId: message._id, x: e.clientX, y: e.clientY });
                      }}
                    >
                      😊
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Show reactions */}
            {message.reactions && message.reactions.length > 0 && (
              <div className="flex gap-1 mt-1 flex-wrap">
                {message.reactions.map((r, i) => (
                  <span key={i} className="bg-base-200 rounded-full px-2 py-0.5 text-xs">
                    {r.emoji}
                  </span>
                ))}
              </div>
            )}

            {message.senderId === authUser._id && (
              <div className="chat-footer opacity-70 mt-1">
                <MessageStatus status={message.status} />
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="chat chat-start">
            <div className="chat-image avatar">
              <div className="size-10 rounded-full border">
                <img src={selectedUser.profilePic || "/avatar.png"} alt="profile pic" />
              </div>
            </div>
            <div className="chat-bubble flex items-center gap-1 bg-base-300">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
            </div>
          </div>
        )}

        <div ref={messageEndRef} />
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-base-200 rounded-lg shadow-lg z-50 py-1 min-w-[160px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            className="w-full text-left px-4 py-2 hover:bg-base-300 text-sm"
            onClick={() => handleDelete(false)}
          >
            🗑️ Delete for me
          </button>
          {contextMenu.isSender && (
            <button
              className="w-full text-left px-4 py-2 hover:bg-base-300 text-sm text-error"
              onClick={() => handleDelete(true)}
            >
              🗑️ Delete for everyone
            </button>
          )}
        </div>
      )}

      {/* Emoji Picker */}
      {emojiPicker && (
        <div
          className="fixed bg-base-200 rounded-full shadow-lg z-50 px-2 py-1 flex gap-1"
          style={{ top: emojiPicker.y - 50, left: emojiPicker.x - 80 }}
          onClick={(e) => e.stopPropagation()}
        >
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              className="text-xl hover:scale-125 transition-transform"
              onClick={() => handleReact(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <MessageInput />
    </div>
  );
};
export default ChatContainer;