const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
    },
    username: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: { len: [2, 100] },
    },
    passwordHash: {
      type: DataTypes.STRING(60),
      field: 'password_hash',
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      unique: true,
      defaultValue: null,
    },
    isactive: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1,
      validate: { isIn: [[0, 1]] },
    },
  }, {
    tableName: 'users',
    defaultScope: { attributes: { exclude: ['passwordHash'] } },
  });



  return User;
};
