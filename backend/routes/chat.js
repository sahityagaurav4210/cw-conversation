const express = require("express");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");
const { Conversation, Message, File } = require("../models");
const {
  decryptChatKey,
  decryptMessage,
  createEncryptStream,
  createDecryptStream,
  encryptMessage,
} = require("../utils/encryption");

const router = express.Router();

// Middleware to verify JWT
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: "Unauthorized" });
    req.user = decoded;
    next();
  });
};

router.use(authMiddleware);

// Get conversations for a user
router.get("/conversations", async (req, res) => {
  try {
    const { sequelize } = require("../models");
    const conversations = await Conversation.findAll({
      where: {
        [sequelize.Sequelize.Op.or]: [
          { user1_id: req.user.id },
          { user2_id: req.user.id },
        ],
      },
      include: ["user1", "user2"],
    });
    res.json(conversations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get messages for a conversation
router.get("/messages/:conversationId", async (req, res) => {
  try {
    const conversationId = req.params.conversationId;
    const conversation = await Conversation.findByPk(conversationId);
    if (!conversation)
      return res.status(404).json({ error: "Conversation not found" });

    const messages = await Message.findAll({
      where: { conversation_id: conversationId },
      order: [["created_at", "ASC"]],
    });
    const files = await File.findAll({
      where: { conversation_id: conversationId },
      order: [["created_at", "ASC"]],
    });

    const chatKey = decryptChatKey(
      conversation.encrypted_chat_key,
      conversation.key_iv,
      conversation.key_auth_tag,
    );

    const decryptedMessages = messages.map((msg) => ({
      id: msg.id,
      conversation_id: msg.conversation_id,
      sender_id: msg.sender_id,
      content: decryptMessage(
        msg.encrypted_content,
        msg.iv,
        msg.auth_tag,
        chatKey,
      ),
      created_at: msg.created_at,
      is_read: msg.is_read,
      type: "text",
    }));

    const fileMessages = files.map((f) => {
      let decryptedCaption = null;
      if (f.encrypted_caption) {
        try {
          decryptedCaption = decryptMessage(
            f.encrypted_caption,
            f.caption_iv,
            f.caption_auth_tag,
            chatKey,
          );
        } catch (e) {
          console.error("Failed to decrypt caption for file", f.id);
        }
      }
      return {
        id: f.id,
        conversation_id: f.conversation_id,
        sender_id: f.sender_id,
        original_name: f.original_name,
        mime_type: f.mime_type,
        size: f.size,
        caption: decryptedCaption,
        created_at: f.created_at,
        is_read: f.is_read,
        type: "file",
      };
    });

    // Combine and sort
    const allMessages = [...decryptedMessages, ...fileMessages].sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at),
    );

    res.json(allMessages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Setup multer for intercepting the upload stream
const storage = multer.memoryStorage(); // We intercept memory and stream to disk ourselves for encryption
const maxUploadSizeMB = process.env.MAX_UPLOAD_SIZE_MB || 5;
const maxUploadSizeBytes = parseInt(maxUploadSizeMB) * 1024 * 1024;
const upload = multer({
  storage: storage,
  limits: { fileSize: maxUploadSizeBytes },
});
const uploadSingle = upload.single("file");

router.post(
  "/files/:conversationId",
  (req, res, next) => {
    uploadSingle(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ error: "File size exceeds limit" });
        }
        return res.status(400).json({ error: err.message });
      } else if (err) {
        return res.status(500).json({ error: "Server error during upload" });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const conversationId = req.params.conversationId;
      const caption = req.body.caption;

      if (caption) {
        const trimmedCaption = caption.trim();
        if (trimmedCaption.length > 2048) {
          return res
            .status(400)
            .json({ error: "Caption cannot exceed 2048 characters." });
        }
        const messageRegex = /^[a-zA-Z0-9 \t\r\n.(),_:\/\-#$/&%@*+'?!;=~\[\]{}<>"`|\\]+$/;
        if (!messageRegex.test(trimmedCaption)) {
          return res
            .status(400)
            .json({ error: "Caption contains invalid characters." });
        }
      }

      const conversation = await Conversation.findByPk(conversationId);
      if (!conversation)
        return res.status(404).json({ error: "Conversation not found" });

      const chatKey = decryptChatKey(
        conversation.encrypted_chat_key,
        conversation.key_iv,
        conversation.key_auth_tag,
      );
      const { cipherStream, iv } = createEncryptStream(chatKey);

      let encryptedCaptionData = null;
      if (caption) {
        encryptedCaptionData = encryptMessage(caption, chatKey);
      }

      const encryptedFilename = `${Date.now()}-${req.file.originalname}.enc`;
      const encryptedPath = path.join(
        __dirname,
        "../uploads",
        encryptedFilename,
      );

      const writeStream = fs.createWriteStream(encryptedPath);

      // Push buffer to cipher stream, then to write stream
      cipherStream.pipe(writeStream);
      cipherStream.write(req.file.buffer);
      cipherStream.end();

      await new Promise((resolve) => writeStream.on("finish", resolve));

      const newFile = await File.create({
        conversation_id: conversationId,
        sender_id: req.user.id,
        original_name: req.file.originalname,
        mime_type: req.file.mimetype,
        size: req.file.size,
        encrypted_path: encryptedPath,
        iv: iv,
        encrypted_caption: encryptedCaptionData
          ? encryptedCaptionData.encryptedContent
          : null,
        caption_iv: encryptedCaptionData ? encryptedCaptionData.iv : null,
        caption_auth_tag: encryptedCaptionData
          ? encryptedCaptionData.authTag
          : null,
      });

      const filePayload = {
        id: newFile.id,
        conversation_id: conversationId,
        sender_id: req.user.id,
        sender_name: req.user.name,
        sender_username: req.user.username,
        original_name: newFile.original_name,
        mime_type: newFile.mime_type,
        size: newFile.size,
        caption: caption || null,
        is_read: false,
        type: "file",
        created_at: newFile.created_at,
      };

      const io = req.app.get("io");
      if (io) {
        io.to(`conv_${conversationId}`).emit("new_message", filePayload);
        const receiverId =
          conversation.user1_id === req.user.id
            ? conversation.user2_id
            : conversation.user1_id;
        io.to(`user_${receiverId}`).emit("incoming_message", filePayload);
      }

      res.status(201).json(filePayload);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

router.get("/files/download/:fileId", async (req, res) => {
  try {
    const fileRecord = await File.findByPk(req.params.fileId);
    if (!fileRecord) return res.status(404).json({ error: "File not found" });

    const conversation = await Conversation.findByPk(
      fileRecord.conversation_id,
    );
    const chatKey = decryptChatKey(
      conversation.encrypted_chat_key,
      conversation.key_iv,
      conversation.key_auth_tag,
    );

    const decipherStream = createDecryptStream(chatKey, fileRecord.iv);

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileRecord.original_name}"`,
    );
    res.setHeader("Content-Type", fileRecord.mime_type);

    const readStream = fs.createReadStream(fileRecord.encrypted_path);

    readStream.pipe(decipherStream).pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
