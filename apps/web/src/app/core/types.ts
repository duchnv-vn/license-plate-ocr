export type Role = 'admin' | 'operator' | 'viewer';
export interface User {
  id: number; email: string; full_name: string; role: Role;
  is_active: boolean; created_at: string;
}
export interface Settings {
  detection_threshold: number; ocr_threshold: number;
  max_upload_mb: number; save_operation_metadata: boolean;
}
export interface Plate {
  text: string; detection_confidence: number; ocr_confidence: number | null;
  bbox: {x: number; y: number; width: number; height: number};
  character_confidences: {character: string; confidence: number}[];
  region: string | null;
}
export interface Prediction {
  width: number; height: number; duration_ms: number; plate_count: number; plates: Plate[];
}
export interface Dashboard {
  operations_today: number; plates_today: number; average_duration_ms: number;
  average_ocr_confidence: number; operations_last_24h: number;
  trend: {date: string; count: number}[];
  recent: {id:number; timestamp:string; duration_ms:number; plate_count:number; average_confidence:number|null; success:boolean}[];
}
