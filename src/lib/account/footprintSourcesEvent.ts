/** 足迹数据源变更（线索、志愿/公民科学登记、物种记录等） */
export const FOOTPRINT_SOURCES_EVENT = 'terramar-footprint-sources'

export function notifyFootprintSourcesChanged() {
  window.dispatchEvent(new Event(FOOTPRINT_SOURCES_EVENT))
}
