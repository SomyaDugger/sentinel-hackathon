import Camera from './Camera';
import Watchlist from './Watchlist';
import Detection from './Detection';

// ── Associations ──────────────────────────────────────────────
Camera.hasMany(Detection, { foreignKey: 'camera_id', as: 'detections' });
Detection.belongsTo(Camera, { foreignKey: 'camera_id', as: 'camera' });

Watchlist.hasMany(Detection, { foreignKey: 'watchlist_id', as: 'detections' });
Detection.belongsTo(Watchlist, { foreignKey: 'watchlist_id', as: 'watchlist' });

export { Camera, Watchlist, Detection };
