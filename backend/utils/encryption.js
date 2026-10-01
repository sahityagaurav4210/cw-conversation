const crypto = require("crypto");

// Server Master Key should be 32 bytes (64 hex characters)
const getMasterKey = () => {
  return Buffer.from(process.env.SERVER_MASTER_KEY, "hex");
};

// --- KEY MANAGEMENT ---

// Generates a random 256-bit key for a conversation
const generateChatKey = () => {
  return crypto.randomBytes(32).toString("hex");
};

// Encrypts the conversation key using the server's master key
const encryptChatKey = (chatKeyHex) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getMasterKey(), iv);
  let encrypted = cipher.update(Buffer.from(chatKeyHex, "hex"));
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    encryptedKey: encrypted.toString("hex"),
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
  };
};

// Decrypts the conversation key using the server's master key
const decryptChatKey = (encryptedKeyHex, ivHex, authTagHex) => {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getMasterKey(),
    Buffer.from(ivHex, "hex"),
  );
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  let decrypted = decipher.update(Buffer.from(encryptedKeyHex, "hex"));
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString("hex"); // Returns the chat key in hex
};

// --- TEXT ENCRYPTION (AES-256-GCM) ---

const encryptMessage = (text, chatKeyHex) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    Buffer.from(chatKeyHex, "hex"),
    iv,
  );
  let encrypted = cipher.update(text, "utf8");
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    encryptedContent: encrypted.toString("hex"),
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
  };
};

const decryptMessage = (encryptedHex, ivHex, authTagHex, chatKeyHex) => {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    Buffer.from(chatKeyHex, "hex"),
    Buffer.from(ivHex, "hex"),
  );
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  let decrypted = decipher.update(Buffer.from(encryptedHex, "hex"));
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString("utf8");
};

// --- FILE ENCRYPTION (AES-256-CTR Streams) ---

// Returns a Transform stream that encrypts data as it passes through
const createEncryptStream = (chatKeyHex) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    "aes-256-ctr",
    Buffer.from(chatKeyHex, "hex"),
    iv,
  );
  return { cipherStream: cipher, iv: iv.toString("hex") };
};

// Returns a Transform stream that decrypts data as it passes through
const createDecryptStream = (chatKeyHex, ivHex) => {
  return crypto.createDecipheriv(
    "aes-256-ctr",
    Buffer.from(chatKeyHex, "hex"),
    Buffer.from(ivHex, "hex"),
  );
};

module.exports = {
  generateChatKey,
  encryptChatKey,
  decryptChatKey,
  encryptMessage,
  decryptMessage,
  createEncryptStream,
  createDecryptStream,
};
