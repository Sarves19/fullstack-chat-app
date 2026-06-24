import User from "../models/user.model.js";
import Message from "../models/message.model.js";

import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");
    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
      deletedForEveryone: { $ne: true },
      deletedFor: { $nin: [myId] },
    });

    await Message.updateMany(
      { senderId: userToChatId, receiverId: myId, status: "sent" },
      { status: "delivered" }
    );

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const markMessagesRead = async (req, res) => {
  try {
    const { id: senderId } = req.params;
    const myId = req.user._id;

    await Message.updateMany(
      { senderId, receiverId: myId, status: { $ne: "read" } },
      { status: "read" }
    );

    const senderSocketId = getReceiverSocketId(senderId);
    if (senderSocketId) {
      io.to(senderSocketId).emit("messagesRead", { senderId: myId });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.log("Error in markMessagesRead controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      status: "sent",
    });

    await newMessage.save();

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
      await Message.findByIdAndUpdate(newMessage._id, { status: "delivered" });
      newMessage.status = "delivered";
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const { deleteForEveryone } = req.body;
    const myId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: "Message not found" });

    if (deleteForEveryone) {
      if (message.senderId.toString() !== myId.toString()) {
        return res.status(403).json({ error: "Not authorized" });
      }
      await Message.findByIdAndUpdate(messageId, { deletedForEveryone: true, text: null, image: null });

      const receiverSocketId = getReceiverSocketId(message.receiverId.toString());
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("messageDeleted", { messageId, deleteForEveryone: true });
      }
    } else {
      await Message.findByIdAndUpdate(messageId, { $push: { deletedFor: myId } });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.log("Error in deleteMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const reactToMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const { emoji } = req.body;
    const myId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ error: "Message not found" });

    // Remove existing reaction from this user then add new one
    await Message.findByIdAndUpdate(messageId, {
      $pull: { reactions: { userId: myId } },
    });

    await Message.findByIdAndUpdate(messageId, {
      $push: { reactions: { userId: myId, emoji } },
    });

    const updatedMessage = await Message.findById(messageId);

    // Notify the other person
    const otherUserId = message.senderId.toString() === myId.toString()
      ? message.receiverId.toString()
      : message.senderId.toString();

    const otherSocketId = getReceiverSocketId(otherUserId);
    if (otherSocketId) {
      io.to(otherSocketId).emit("messageReaction", {
        messageId,
        reactions: updatedMessage.reactions,
      });
    }

    res.status(200).json({ reactions: updatedMessage.reactions });
  } catch (error) {
    console.log("Error in reactToMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};