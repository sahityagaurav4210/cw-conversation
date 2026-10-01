const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Conversation = sequelize.define('Conversation', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    encrypted_chat_key: {
        type: DataTypes.STRING(1024),
        allowNull: false
    },
    key_iv: {
        type: DataTypes.STRING,
        allowNull: false
    },
    key_auth_tag: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    tableName: 'conversations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

module.exports = Conversation;
