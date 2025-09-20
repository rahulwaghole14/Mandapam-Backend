const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const WhatsAppConfig = sequelize.define('WhatsAppConfig', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    instanceId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'instance_id',
      validate: {
        notEmpty: {
          msg: 'Instance ID is required'
        }
      }
    },
    accessToken: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'access_token',
      validate: {
        notEmpty: {
          msg: 'Access token is required'
        }
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'created_by',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at'
    }
  }, {
    tableName: 'whatsapp_config',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['is_active'],
        where: {
          is_active: true
        }
      }
    ]
  });

  // Instance methods
  WhatsAppConfig.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    // Don't expose sensitive data in JSON responses
    delete values.accessToken;
    return values;
  };

  // Class methods
  WhatsAppConfig.getActiveConfig = async function() {
    return await this.findOne({
      where: { isActive: true },
      order: [['createdAt', 'DESC']]
    });
  };

  WhatsAppConfig.deactivateAll = async function() {
    return await this.update(
      { isActive: false },
      { where: { isActive: true } }
    );
  };

  return WhatsAppConfig;
};
