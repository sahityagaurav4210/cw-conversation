const sequelize = require('../config/database');
const User = require('./User');
const Conversation = require('./Conversation');
const Message = require('./Message');
const File = require('./File');
const Feedback = require('./Feedback');
const EmailClientMaster = require('./EmailClientMaster');

// User <-> Conversation
User.hasMany(Conversation, { foreignKey: 'user1_id', as: 'started_conversations' });
User.hasMany(Conversation, { foreignKey: 'user2_id', as: 'received_conversations' });
Conversation.belongsTo(User, { foreignKey: 'user1_id', as: 'user1' });
Conversation.belongsTo(User, { foreignKey: 'user2_id', as: 'user2' });

// Conversation <-> Message
Conversation.hasMany(Message, { foreignKey: 'conversation_id' });
Message.belongsTo(Conversation, { foreignKey: 'conversation_id' });

// User <-> Message (Sender)
User.hasMany(Message, { foreignKey: 'sender_id' });
Message.belongsTo(User, { foreignKey: 'sender_id' });

// Conversation <-> File
Conversation.hasMany(File, { foreignKey: 'conversation_id' });
File.belongsTo(Conversation, { foreignKey: 'conversation_id' });

// User <-> File (Sender)
User.hasMany(File, { foreignKey: 'sender_id' });
File.belongsTo(User, { foreignKey: 'sender_id' });

// User <-> Feedback
User.hasMany(Feedback, { foreignKey: 'user_id' });
Feedback.belongsTo(User, { foreignKey: 'user_id' });

module.exports = {
    sequelize,
    User,
    Conversation,
    Message,
    File,
    Feedback,
    EmailClientMaster
};

