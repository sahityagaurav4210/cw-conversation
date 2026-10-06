const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const EmailClientMaster = sequelize.define(
  "EmailClientMaster",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    domain: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
  },
  {
    tableName: "email_client_masters",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  },
);

module.exports = EmailClientMaster;
