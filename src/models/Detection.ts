import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface DetectionAttributes {
  id: string;
  camera_id: string;
  license_plate: string;
  confidence: number;
  snapshot_url: string;
  detected_at: Date;
  is_watchlist_match: boolean;
  watchlist_id: string | null;
  alert_status: 'New' | 'Acknowledged' | 'Resolved';
}

interface DetectionCreationAttributes
  extends Optional<
    DetectionAttributes,
    'id' | 'detected_at' | 'is_watchlist_match' | 'watchlist_id' | 'alert_status'
  > {}

class Detection
  extends Model<DetectionAttributes, DetectionCreationAttributes>
  implements DetectionAttributes
{
  public id!: string;
  public camera_id!: string;
  public license_plate!: string;
  public confidence!: number;
  public snapshot_url!: string;
  public detected_at!: Date;
  public is_watchlist_match!: boolean;
  public watchlist_id!: string | null;
  public alert_status!: 'New' | 'Acknowledged' | 'Resolved';

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Associations (populated via include)
  public readonly camera?: any;
  public readonly watchlist?: any;
}

Detection.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    camera_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'cameras',
        key: 'id',
      },
    },
    license_plate: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    confidence: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        min: 0,
        max: 1,
      },
    },
    snapshot_url: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    detected_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    is_watchlist_match: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    watchlist_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'watchlists',
        key: 'id',
      },
    },
    alert_status: {
      type: DataTypes.ENUM('New', 'Acknowledged', 'Resolved'),
      defaultValue: 'New',
    },
  },
  {
    sequelize,
    tableName: 'detections',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['license_plate'] },
      { fields: ['detected_at'] },
      { fields: ['camera_id'] },
      { fields: ['is_watchlist_match'] },
    ],
  }
);

export default Detection;
