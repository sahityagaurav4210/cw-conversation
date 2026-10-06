const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const { sequelize, User, Conversation, Message, File } = require("./models");
const authRoutes = require("./routes/auth");
const chatRoutes = require("./routes/chat");
const feedbackRoutes = require("./routes/feedback");

const {
  generateChatKey,
  encryptChatKey,
  decryptChatKey,
  encryptMessage,
  decryptMessage,
} = require("./utils/encryption");

const bcrypt = require("bcryptjs");

const app = express();
const server = http.createServer(app);

const path = require("path");
const fs = require("fs");

app.use(cors({ origin: "*" }));
app.use(express.json());

// Ensure uploads directories exist
const uploadDir = path.join(__dirname, "uploads");
const profileUploadDir = path.join(__dirname, "uploads", "profiles");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(profileUploadDir))
  fs.mkdirSync(profileUploadDir, { recursive: true });

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/feedback", feedbackRoutes);

const io = new Server(server, {
  cors: { origin: "*" },
});
app.set("io", io);

const onlineUsers = new Map();
const activeUserSockets = new Map();

// Authentication Middleware for Socket.io
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error("Authentication error"));
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error("Authentication error"));
    socket.user = decoded;
    next();
  });
});

io.on("connection", (socket) => {
  const userId = socket.user.id;

  // Singleton Enforcement: Disconnect any pre-existing connection for this user first
  if (activeUserSockets.has(userId)) {
    const existingSocket = activeUserSockets.get(userId);
    if (existingSocket && existingSocket.id !== socket.id) {
      console.log(
        `[Singleton Socket] Disconnecting existing socket (${existingSocket.id}) for user ${socket.user.username} (ID: ${userId})`,
      );
      existingSocket.emit("force_disconnect", {
        reason: `New connection established for user ${socket.user.username}`,
      });
      existingSocket.disconnect(true);
    }
  }

  // Register current socket as the single active connection for this user
  activeUserSockets.set(userId, socket);
  const wasOnline = onlineUsers.has(userId);
  onlineUsers.set(userId, 1);

  if (!wasOnline) {
    io.emit("user_online", { userId });
  }

  // Emit current list of online users to the newly connected user
  socket.emit("online_users", Array.from(onlineUsers.keys()));

  console.log(`User connected: ${socket.user.username} (Socket ID: ${socket.id})`);

  // Join a personal room for receiving incoming chat notifications
  socket.join(`user_${socket.user.id}`);

  // When opening a chat window with someone
  socket.on("join_conversation", async (targetUserId) => {
    // Find or create conversation
    let conversation = await Conversation.findOne({
      where: {
        [sequelize.Sequelize.Op.or]: [
          { user1_id: socket.user.id, user2_id: targetUserId },
          { user1_id: targetUserId, user2_id: socket.user.id },
        ],
      },
    });

    if (!conversation) {
      const rawChatKey = generateChatKey();
      const encrypted = encryptChatKey(rawChatKey);
      conversation = await Conversation.create({
        user1_id: socket.user.id,
        user2_id: targetUserId,
        encrypted_chat_key: encrypted.encryptedKey,
        key_iv: encrypted.iv,
        key_auth_tag: encrypted.authTag,
      });
    }

    socket.join(`conv_${conversation.id}`);
    socket.emit("conversation_joined", { conversationId: conversation.id });
  });

  socket.on("typing", ({ conversationId }) => {
    socket.broadcast
      .to(`conv_${conversationId}`)
      .emit("typing", { userId: socket.user.id });
  });

  socket.on("stop_typing", ({ conversationId }) => {
    socket.broadcast
      .to(`conv_${conversationId}`)
      .emit("stop_typing", { userId: socket.user.id });
  });

  socket.on("mark_read", async ({ conversationId, messageIds, fileIds }) => {
    if (!conversationId) return;

    if (messageIds && messageIds.length > 0) {
      await Message.update(
        { is_read: true },
        {
          where: { id: messageIds, conversation_id: conversationId },
        },
      );
    }

    if (fileIds && fileIds.length > 0) {
      await File.update(
        { is_read: true },
        {
          where: { id: fileIds, conversation_id: conversationId },
        },
      );
    }

    socket.broadcast.to(`conv_${conversationId}`).emit("messages_read", {
      conversationId,
      messageIds: messageIds || [],
      fileIds: fileIds || [],
    });
  });

  socket.on("send_message", async (data) => {
    const { conversationId, content } = data;

    if (!content || typeof content !== "string") return;
    const trimmedContent = content.trim();
    if (!trimmedContent || trimmedContent.length > 50000) return;

    const isCodeBlock = trimmedContent.startsWith("```");
    const messageRegex = /^[a-zA-Z0-9 \t\r\n.(),_:\/\-#$/&%@*+'?!;=~\[\]{}<>"`|\\]+$/;

    if (!isCodeBlock && !messageRegex.test(trimmedContent)) return;

    const conversation = await Conversation.findByPk(conversationId);
    if (!conversation) return;

    // Decrypt the chat master key
    const chatKey = decryptChatKey(
      conversation.encrypted_chat_key,
      conversation.key_iv,
      conversation.key_auth_tag,
    );

    // Encrypt the message
    const encrypted = encryptMessage(content, chatKey);

    const message = await Message.create({
      conversation_id: conversationId,
      sender_id: socket.user.id,
      encrypted_content: encrypted.encryptedContent,
      iv: encrypted.iv,
      auth_tag: encrypted.authTag,
    });

    const messagePayload = {
      id: message.id,
      conversation_id: conversationId,
      sender_id: socket.user.id,
      sender_name: socket.user.name,
      sender_username: socket.user.username,
      content: content,
      is_read: false,
      type: "text",
      created_at: message.created_at,
    };

    // Broadcast the decrypted message to people in the conversation room
    io.to(`conv_${conversationId}`).emit("new_message", messagePayload);

    // Also notify the receiver in their personal room so their sidebar updates
    const receiverId =
      conversation.user1_id === socket.user.id
        ? conversation.user2_id
        : conversation.user1_id;
    io.to(`user_${receiverId}`).emit("incoming_message", messagePayload);
  });

  socket.on("disconnect", (reason) => {
    // Only cleanup if this disconnected socket is the currently registered active socket for the user
    if (activeUserSockets.get(userId)?.id === socket.id) {
      activeUserSockets.delete(userId);
      onlineUsers.delete(userId);
      io.emit("user_offline", { userId });
      console.log(`User disconnected: ${socket.user.username} (${reason})`);
    } else {
      console.log(`Stale socket disconnected for user: ${socket.user.username} (${reason})`);
    }
  });
});

async function seedAdminUser() {
  try {
    const adminUsername = process.env.INIT_ADMIN_USER || "admin";
    const adminPassword = process.env.INIT_ADMIN_PASS || "Admin@12345";

    const existingAdmin = await User.findOne({
      where: { username: adminUsername },
    });
    if (!existingAdmin) {
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(adminPassword, salt);
      await User.create({
        username: adminUsername,
        password_hash,
        name: "Administrator",
        role: "admin",
      });
      console.log(
        `Initial admin user '${adminUsername}' created successfully.`,
      );
    } else if (existingAdmin.role !== "admin") {
      existingAdmin.role = "admin";
      await existingAdmin.save();
    }
  } catch (err) {
    console.error("Error seeding admin user:", err);
  }
}

async function seedEmailClients() {
  try {
    const { EmailClientMaster } = require("./models");
    const count = await EmailClientMaster.count();
    if (count === 0) {
      const defaultDomains = [
        "gmail.com",
        "yahoo.com",
        "outlook.com",
        "hotmail.com",
        "icloud.com",
      ];
      for (const domain of defaultDomains) {
        await EmailClientMaster.create({ domain, is_active: true });
      }
      console.log("Default email client domains seeded.");
    }
  } catch (err) {
    console.error("Error seeding email clients:", err);
  }
}

const PORT = process.env.PORT || 5000;
sequelize.sync({ alter: true }).then(async () => {
  console.log("Database synced");
  await seedAdminUser();
  await seedEmailClients();
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT} (0.0.0.0)`);
  });
});
