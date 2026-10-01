const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const File = sequelize.define('File', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    original_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    mime_type: {
        type: DataTypes.STRING,
        allowNull: false
    },
    size: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    encrypted_path: {
        type: DataTypes.STRING,
        allowNull: false
    },
    iv: {
        type: DataTypes.STRING,
        allowNull: false
    },
    encrypted_caption: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    caption_iv: {
        type: DataTypes.STRING,
        allowNull: true
    },
    caption_auth_tag: {
        type: DataTypes.STRING,
        allowNull: true
    },
    is_read: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'files',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

module.exports = File;
