import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      set({ messages: [...messages, res.data] });
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  markMessagesRead: async (userId) => {
    try {
      await axiosInstance.put(`/messages/read/${userId}`);
      set({
        messages: get().messages.map((msg) =>
          msg.senderId === userId ? { ...msg, status: "read" } : msg
        ),
      });
    } catch (error) {
      console.log("Error marking messages as read:", error);
    }
  },

  deleteMessage: async (messageId, deleteForEveryone) => {
    try {
      await axiosInstance.delete(`/messages/${messageId}`, {
        data: { deleteForEveryone },
      });

      if (deleteForEveryone) {
        set({
          messages: get().messages.map((msg) =>
            msg._id === messageId
              ? { ...msg, text: "This message was deleted", image: null, deletedForEveryone: true }
              : msg
          ),
        });
      } else {
        set({
          messages: get().messages.filter((msg) => msg._id !== messageId),
        });
      }
    } catch (error) {
      toast.error("Failed to delete message");
    }
  },

  reactToMessage: async (messageId, emoji) => {
    try {
      const res = await axiosInstance.put(`/messages/react/${messageId}`, { emoji });
      set({
        messages: get().messages.map((msg) =>
          msg._id === messageId ? { ...msg, reactions: res.data.reactions } : msg
        ),
      });
    } catch (error) {
      toast.error("Failed to react to message");
    }
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;

    socket.on("newMessage", (newMessage) => {
      const isMessageSentFromSelectedUser = newMessage.senderId === selectedUser._id;
      if (!isMessageSentFromSelectedUser) return;
      set({ messages: [...get().messages, newMessage] });
    });

    socket.on("messagesRead", ({ senderId }) => {
      set({
        messages: get().messages.map((msg) =>
          msg.receiverId === senderId ? { ...msg, status: "read" } : msg
        ),
      });
    });

    socket.on("messageDeleted", ({ messageId, deleteForEveryone }) => {
      if (deleteForEveryone) {
        set({
          messages: get().messages.map((msg) =>
            msg._id === messageId
              ? { ...msg, text: "This message was deleted", image: null, deletedForEveryone: true }
              : msg
          ),
        });
      }
    });

    socket.on("messageReaction", ({ messageId, reactions }) => {
      set({
        messages: get().messages.map((msg) =>
          msg._id === messageId ? { ...msg, reactions } : msg
        ),
      });
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
    socket.off("messagesRead");
    socket.off("messageDeleted");
    socket.off("messageReaction");
  },

  setSelectedUser: (selectedUser) => set({ selectedUser }),
}));