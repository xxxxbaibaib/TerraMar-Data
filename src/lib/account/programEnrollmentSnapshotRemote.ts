/**
 * 购课报名信息快照（与山海云统一档案共用底层实现）。
 */
export type { ShanhaiyunProfileSnapshot as ProgramEnrollmentSnapshot } from './shanhaiyunProfileSnapshotRemote'
export {
  fetchLatestShanhaiyunProfileSnapshot as fetchLastProgramEnrollmentSnapshot,
  isShanhaiyunProfileSnapshotComplete as isProgramEnrollmentSnapshotComplete,
  snapshotToMapPoiChoice,
  snapshotToUserGeo,
} from './shanhaiyunProfileSnapshotRemote'
