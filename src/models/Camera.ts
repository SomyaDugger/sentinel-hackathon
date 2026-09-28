import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface CameraAttributes {
  id: string;
  camera_code: string | null;
  department_name: string;
  district: string;
  city_or_taluka: string;
  landmark: string;
  camera_type: 'ANPR' | 'PTZ' | 'Fixed Bullet' | 'Dome' | 'Analog-Encoder';
  status: 'Active' | 'Inactive';
  rtsp_url: string;
  vms_vendor: string;
  retention_days: number;
  resolution: string;
  health_status: 'Online' | 'Offline' | 'Degraded';
  location: object | null;
}

interface CameraCreationAttributes
  extends Optional<
    CameraAttributes,
    'id' | 'camera_code' | 'status' | 'retention_days' | 'health_status' | 'location' | 'resolution'
  > {}

class Camera
  extends Model<CameraAttributes, CameraCreationAttributes>
  implements CameraAttributes
{
  public id!: string;
  public camera_code!: string | null;
  public department_name!: string;
  public district!: string;
  public city_or_taluka!: string;
  public landmark!: string;
  public camera_type!: 'ANPR' | 'PTZ' | 'Fixed Bullet' | 'Dome' | 'Analog-Encoder';
  public status!: 'Active' | 'Inactive';
  public rtsp_url!: string;
  public vms_vendor!: string;
  public retention_days!: number;
  public resolution!: string;
  public health_status!: 'Online' | 'Offline' | 'Degraded';
  public location!: object | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Camera.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    camera_code: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    department_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    district: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    city_or_taluka: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    landmark: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    camera_type: {
      type: DataTypes.ENUM('ANPR', 'PTZ', 'Fixed Bullet', 'Dome', 'Analog-Encoder'),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('Active', 'Inactive'),
      defaultValue: 'Active',
    },
    rtsp_url: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    vms_vendor: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    retention_days: {
      type: DataTypes.INTEGER,
      defaultValue: 15,
    },
    resolution: {
      type: DataTypes.STRING,
      defaultValue: '1080p',
    },
    health_status: {
      type: DataTypes.ENUM('Online', 'Offline', 'Degraded'),
      defaultValue: 'Online',
    },
    location: {
      type: DataTypes.GEOMETRY('POINT', 4326),
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'cameras',
    timestamps: true,
    underscored: true,
  }
);

export default Camera;
