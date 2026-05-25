import { supabase } from './supabase';
import { Player, Club, ShotResult, Course, CourseHole, Round, RoundPlayer, HoleScore, HoleStats, Shot } from './types';

// ─── Session (sessionStorage — sin Supabase Auth) ──────────────────────────

export function getSession(): boolean {
  try { return sessionStorage.getItem('gt_session') === 'true'; } catch { return false; }
}
export function saveSession(value: boolean): void {
  try { sessionStorage.setItem('gt_session', value ? 'true' : 'false'); } catch {}
}

// ─── Players ───────────────────────────────────────────────────────────────

export async function getPlayers(): Promise<Player[]> {
  const { data, error } = await supabase.from('players').select('*').order('created_at');
  if (error) throw error;
  return (data ?? []).map(r => ({ id: r.id, name: r.name, createdAt: r.created_at }));
}

export async function addPlayer(player: { name: string }): Promise<Player> {
  const { data, error } = await supabase
    .from('players').insert({ name: player.name }).select().single();
  if (error) throw error;
  return { id: data.id, name: data.name, createdAt: data.created_at };
}

export async function deletePlayer(id: string): Promise<void> {
  const { error } = await supabase.from('players').delete().eq('id', id);
  if (error) throw error;
}

// ─── Clubs ─────────────────────────────────────────────────────────────────

export async function getClubs(): Promise<Club[]> {
  const { data, error } = await supabase.from('clubs').select('*').order('created_at');
  if (error) throw error;
  return (data ?? []).map(r => ({ id: r.id, name: r.name }));
}

export async function addClub(club: { name: string }): Promise<Club> {
  const { data, error } = await supabase
    .from('clubs').insert({ name: club.name }).select().single();
  if (error) throw error;
  return { id: data.id, name: data.name };
}

export async function deleteClub(id: string): Promise<void> {
  const { error } = await supabase.from('clubs').delete().eq('id', id);
  if (error) throw error;
}

// ─── Shot Results ──────────────────────────────────────────────────────────

export async function getShotResults(): Promise<ShotResult[]> {
  const { data, error } = await supabase.from('shot_results').select('*').order('id');
  if (error) throw error;
  return (data ?? []).map(r => ({ id: r.id, name: r.name }));
}

// ─── Courses ───────────────────────────────────────────────────────────────

export async function getCourses(): Promise<Course[]> {
  const { data, error } = await supabase.from('courses').select('*').order('created_at');
  if (error) throw error;
  return (data ?? []).map(r => ({ id: r.id, name: r.name, numberOfHoles: r.number_of_holes }));
}

export async function addCourse(course: { name: string; numberOfHoles: number }): Promise<Course> {
  const { data, error } = await supabase
    .from('courses')
    .insert({ name: course.name, number_of_holes: course.numberOfHoles })
    .select().single();
  if (error) throw error;
  return { id: data.id, name: data.name, numberOfHoles: data.number_of_holes };
}

export async function updateCourse(course: Course): Promise<void> {
  const { error } = await supabase
    .from('courses')
    .update({ name: course.name, number_of_holes: course.numberOfHoles })
    .eq('id', course.id);
  if (error) throw error;
}

export async function deleteCourse(id: string): Promise<void> {
  await supabase.from('course_holes').delete().eq('course_id', id);
  const { error } = await supabase.from('courses').delete().eq('id', id);
  if (error) throw error;
}

// ─── Course Holes ──────────────────────────────────────────────────────────

export async function getHolesForCourse(courseId: string): Promise<CourseHole[]> {
  const { data, error } = await supabase
    .from('course_holes').select('*').eq('course_id', courseId).order('hole_number');
  if (error) throw error;
  return (data ?? []).map(r => ({
    id: r.id, courseId: r.course_id, holeNumber: r.hole_number,
    par: r.par as 3|4|5, description: r.description ?? '', yards: r.yards ?? 0,
  }));
}

export async function saveHolesForCourse(courseId: string, holes: CourseHole[]): Promise<void> {
  await supabase.from('course_holes').delete().eq('course_id', courseId);
  if (holes.length === 0) return;
  const rows = holes.map(h => ({
    course_id: h.courseId,
    hole_number: h.holeNumber,
    par: h.par,
    description: h.description,
    yards: h.yards,
  }));
  const { error } = await supabase.from('course_holes').insert(rows);
  if (error) throw error;
}

// ─── Rounds ────────────────────────────────────────────────────────────────

export async function getRounds(): Promise<Round[]> {
  const { data, error } = await supabase
    .from('rounds').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toRound);
}

export async function getRound(id: string): Promise<Round | null> {
  const { data, error } = await supabase.from('rounds').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return toRound(data);
}

export async function addRound(data: Omit<Round, 'id'|'createdAt'>): Promise<Round> {
  const { data: row, error } = await supabase
    .from('rounds')
    .insert({ date: data.date, course_id: data.courseId, holes_played: data.holesPlayed, status: data.status })
    .select().single();
  if (error) throw error;
  return toRound(row);
}

export async function updateRound(round: Round): Promise<void> {
  const { error } = await supabase
    .from('rounds')
    .update({ date: round.date, course_id: round.courseId, holes_played: round.holesPlayed, status: round.status })
    .eq('id', round.id);
  if (error) throw error;
}

function toRound(r: Record<string, unknown>): Round {
  return {
    id: r.id as string, date: r.date as string, courseId: r.course_id as string,
    holesPlayed: r.holes_played as 9|18, status: r.status as 'in_progress'|'completed',
    createdAt: r.created_at as string,
  };
}

// ─── Round Players ─────────────────────────────────────────────────────────

export async function getRoundPlayersForRound(roundId: string): Promise<RoundPlayer[]> {
  const { data, error } = await supabase.from('round_players').select('*').eq('round_id', roundId);
  if (error) throw error;
  return (data ?? []).map(toRoundPlayer);
}

export async function getAllRoundPlayers(): Promise<RoundPlayer[]> {
  const { data, error } = await supabase.from('round_players').select('*');
  if (error) throw error;
  return (data ?? []).map(toRoundPlayer);
}

export async function addRoundPlayers(rps: Omit<RoundPlayer, 'id'>[]): Promise<RoundPlayer[]> {
  const rows = rps.map(r => ({ round_id: r.roundId, player_id: r.playerId, tracking_level: r.trackingLevel }));
  const { data, error } = await supabase.from('round_players').insert(rows).select();
  if (error) throw error;
  return (data ?? []).map(toRoundPlayer);
}

export async function removePlayerFromRound(roundId: string, playerId: string): Promise<void> {
  await Promise.all([
    supabase.from('round_players').delete().eq('round_id', roundId).eq('player_id', playerId),
    supabase.from('hole_scores').delete().eq('round_id', roundId).eq('player_id', playerId),
    supabase.from('hole_stats').delete().eq('round_id', roundId).eq('player_id', playerId),
    supabase.from('shots').delete().eq('round_id', roundId).eq('player_id', playerId),
  ]);
}

function toRoundPlayer(r: Record<string, unknown>): RoundPlayer {
  return {
    id: r.id as string, roundId: r.round_id as string, playerId: r.player_id as string,
    trackingLevel: r.tracking_level as 'score'|'stats'|'shots',
  };
}

// ─── Hole Scores ───────────────────────────────────────────────────────────

export async function getHoleScoresForRound(roundId: string): Promise<HoleScore[]> {
  const { data, error } = await supabase.from('hole_scores').select('*').eq('round_id', roundId);
  if (error) throw error;
  return (data ?? []).map(r => ({
    id: r.id, roundId: r.round_id, playerId: r.player_id,
    holeNumber: r.hole_number, strokes: r.strokes,
  }));
}

export async function upsertHoleScore(score: Omit<HoleScore, 'id'>): Promise<void> {
  const { error } = await supabase.from('hole_scores').upsert(
    { round_id: score.roundId, player_id: score.playerId, hole_number: score.holeNumber, strokes: score.strokes },
    { onConflict: 'round_id,player_id,hole_number' }
  );
  if (error) throw error;
}

// ─── Hole Stats ────────────────────────────────────────────────────────────

export async function getHoleStatsForRound(roundId: string): Promise<HoleStats[]> {
  const { data, error } = await supabase.from('hole_stats').select('*').eq('round_id', roundId);
  if (error) throw error;
  return (data ?? []).map(toHoleStats);
}

export async function getHoleStatsForPlayer(roundId: string, playerId: string, holeNumber: number): Promise<HoleStats | null> {
  const { data, error } = await supabase
    .from('hole_stats').select('*')
    .eq('round_id', roundId).eq('player_id', playerId).eq('hole_number', holeNumber)
    .maybeSingle();
  if (error || !data) return null;
  return toHoleStats(data);
}

// Accepts the full HoleStats object; the id field is ignored (upsert uses composite key)
export async function upsertHoleStats(stats: HoleStats | Omit<HoleStats, 'id'>): Promise<void> {
  const { error } = await supabase.from('hole_stats').upsert(
    {
      round_id: stats.roundId, player_id: stats.playerId, hole_number: stats.holeNumber,
      strokes: stats.strokes, fairway_hit: stats.fairwayHit, green_hit: stats.greenHit,
      in_bunker: stats.inBunker, penalty: stats.penalty, putts: stats.putts, gir: stats.gir,
    },
    { onConflict: 'round_id,player_id,hole_number' }
  );
  if (error) throw error;
}

function toHoleStats(r: Record<string, unknown>): HoleStats {
  return {
    id: r.id as string, roundId: r.round_id as string, playerId: r.player_id as string,
    holeNumber: r.hole_number as number, strokes: r.strokes as number,
    fairwayHit: r.fairway_hit as boolean|null, greenHit: r.green_hit as boolean|null,
    inBunker: r.in_bunker as boolean, penalty: r.penalty as boolean,
    putts: r.putts as number, gir: r.gir as boolean,
  };
}

// ─── Shots ─────────────────────────────────────────────────────────────────

export async function getShotsForRound(roundId: string): Promise<Shot[]> {
  const { data, error } = await supabase
    .from('shots').select('*').eq('round_id', roundId)
    .order('hole_number').order('shot_number');
  if (error) throw error;
  return (data ?? []).map(toShot);
}

export async function getShotsForHole(roundId: string, playerId: string, holeNumber: number): Promise<Shot[]> {
  const { data, error } = await supabase
    .from('shots').select('*')
    .eq('round_id', roundId).eq('player_id', playerId).eq('hole_number', holeNumber)
    .order('shot_number');
  if (error) throw error;
  return (data ?? []).map(toShot);
}

export async function addShot(shot: Omit<Shot, 'id'>): Promise<Shot> {
  const { data, error } = await supabase
    .from('shots')
    .insert({
      round_id: shot.roundId, player_id: shot.playerId, hole_number: shot.holeNumber,
      shot_number: shot.shotNumber,
      club_id: shot.clubId || null,  // empty string → null (penalidades no tienen palo)
      start_position: shot.startPosition,
      result: shot.result, yards: shot.yards, is_penalty: shot.isPenalty,
    })
    .select().single();
  if (error) throw error;
  return toShot(data);
}

export async function updateShot(id: string, data: Partial<Omit<Shot, 'id'>>): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (data.clubId !== undefined) updates.club_id = data.clubId;
  if (data.result !== undefined) updates.result = data.result;
  if (data.yards !== undefined) updates.yards = data.yards;
  if (data.startPosition !== undefined) updates.start_position = data.startPosition;
  if (data.shotNumber !== undefined) updates.shot_number = data.shotNumber;
  if (data.isPenalty !== undefined) updates.is_penalty = data.isPenalty;
  const { error } = await supabase.from('shots').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteShot(id: string): Promise<void> {
  const { error } = await supabase.from('shots').delete().eq('id', id);
  if (error) throw error;
}

export async function deleteShotsForHole(roundId: string, playerId: string, holeNumber: number): Promise<void> {
  const { error } = await supabase
    .from('shots').delete()
    .eq('round_id', roundId).eq('player_id', playerId).eq('hole_number', holeNumber);
  if (error) throw error;
}

function toShot(r: Record<string, unknown>): Shot {
  return {
    id: r.id as string, roundId: r.round_id as string, playerId: r.player_id as string,
    holeNumber: r.hole_number as number, shotNumber: r.shot_number as number,
    clubId: (r.club_id as string) ?? '', startPosition: r.start_position as string,
    result: r.result as string, yards: r.yards as number, isPenalty: r.is_penalty as boolean,
  };
}
