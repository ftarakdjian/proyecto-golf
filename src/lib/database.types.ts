export interface DbPlayer { id: string; name: string; created_at: string }
export interface DbClub { id: string; name: string; created_at: string }
export interface DbShotResult { id: string; name: string }
export interface DbCourse { id: string; name: string; number_of_holes: number; created_at: string }
export interface DbCourseHole {
  id: string; course_id: string; hole_number: number;
  par: 3|4|5; description: string; yards: number
}
export interface DbRound {
  id: string; date: string; course_id: string;
  holes_played: 9|18; status: 'in_progress'|'completed'; created_at: string
}
export interface DbRoundPlayer {
  id: string; round_id: string; player_id: string;
  tracking_level: 'score'|'stats'|'shots'
}
export interface DbHoleScore {
  id: string; round_id: string; player_id: string;
  hole_number: number; strokes: number
}
export interface DbHoleStats {
  id: string; round_id: string; player_id: string; hole_number: number;
  strokes: number; fairway_hit: boolean|null; green_hit: boolean|null;
  in_bunker: boolean; penalty: boolean; putts: number; gir: boolean
}
export interface DbShot {
  id: string; round_id: string; player_id: string; hole_number: number;
  shot_number: number; club_id: string; start_position: string;
  result: string; yards: number; is_penalty: boolean
}
