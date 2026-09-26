import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface WatchlistAttributes {
  id: string;
  license_plate: string;
  entity_type: string;
  alert_priority: 'Low' | 'Medium' | 'High' | 'Critical';
  source_database: 'eGujCop' | 'VAHAN' | 'SARTHI' | 'AFIS/NAFIS' | 'Custom';
  vehicle_make_model: string | null;
  case_reference: string | null;
  notes: string | null;
}

interface WatchlistCreationAttributes
  extends Optional<
    WatchlistAttributes,
    'id' | 'source_database' | 'vehicle_make_model' | 'case_reference' | 'notes'
  > {}

class Watchlist
  extends Model<WatchlistAttributes, WatchlistCreationAttributes>
  implements WatchlistAttributes
{
  public id!: string;
  public license_plate!: string;
  public entity_type!: string;
  public alert_priority!: 'Low' | 'Medium' | 'High' | 'Critical';
  public source_database!: 'eGujCop' | 'VAHAN' | 'SARTHI' | 'AFIS/NAFIS' | 'Custom';
  public vehicle_make_model!: string | null;
  public case_reference!: string | null;
  public notes!: string | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Watchlist.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    license_plate: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    entity_type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    alert_priority: {
      type: DataTypes.ENUM('Low', 'Medium', 'High', 'Critical'),
      allowNull: false,
    },
    source_database: {
      type: DataTypes.ENUM('eGujCop', 'VAHAN', 'SARTHI', 'AFIS/NAFIS', 'Custom'),
      defaultValue: 'eGujCop',
    },
    vehicle_make_model: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    case_reference: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'watchlists',
    timestamps: true,
    underscored: true,
  }
);

export default Watchlist;
