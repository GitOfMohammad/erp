const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('RefreshSession', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  tokenHash: {
    type: DataTypes.STRING(64),
    field: 'token_hash',
    allowNull: false,
    unique: true,
  },
  expiresAt: {
    type: DataTypes.DATE,
    field: 'expires_at',
    allowNull: false,
  },
  revokedAt: {
    type: DataTypes.DATE,
    field: 'revoked_at',
    allowNull: true,
    defaultValue: null,
  },
  lastActivityAt: {
    type: DataTypes.DATE,
    field: 'last_activity_at',
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'refresh_sessions',
  indexes: [{ fields: ['user_id'], name: 'refresh_sessions_user_id_idx' }],
});

