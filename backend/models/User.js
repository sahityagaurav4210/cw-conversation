const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    profile_photo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    sex: {
      type: DataTypes.ENUM("male", "female", "tgp"),
      allowNull: true,
    },
    password_hash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    failed_login_attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    account_locked_until: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    role: {
      type: DataTypes.STRING,
      defaultValue: "user",
      allowNull: false,
    },
    is_deactivated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    suspended_until: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    reset_code: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    reset_code_expires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "users",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  },
);

module.exports = User;
