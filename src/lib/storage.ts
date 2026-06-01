import { supabase } from './supabase';
import { Club, ShotResult, Course, CourseHole, Round, RoundPlayer, HoleScore, HoleStats, Shot } from './types';
import { UserRole } from './users';
import toast from 'react-hot-toast';

function dbError(error: unknown, ctx: string): never {
  const msg = (error as { message?: string })?.message ?? String(error);
  toast.error(`Error en ${ctx}: ${msg}`, { duration: 5000 });
  throw error;
}

// ─── Session (localStorage — solo sesión, sin datos) ────────────────────────

const SESSION_KEY = 'gt_session';

export function getSession(): boolean {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    return JSON.parse(raw)?.loggedIn === true;
  } catch { return false; }
}

export function getSessionUser(): { username: string; role: UserRole } | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p?.loggedIn) return null;
    return { username: p.username, role: p.role as UserRole };
  } catch { return null; }
}

export function saveSession(username: string, role: UserRole): void {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify({ loggedIn: true, username, role })); } catch {}
}

export function clearSession(): void {
  try { localStorage.removeItem(SESSION_KEY); } catch {}
}

// ─── Clubs (globales) ────────────────────────────────────────────────────────

export async function getClubs(): Promise<Club[]> {
  const { data, error } = await supabase.from('clubs').select('*').order('created_at');
  if (error) dbError(error, 'cargar palos');
  return (data ?? []).map(r => ({ id: r.id, name: r.name }));
}

export async function addClub(club: { name: string }): Promise<Club> {
  const { data, error } = await supabase.from('clubs').insert({ name: club.name }).select().single();
  if (error) dbError(error, 'agregar palo');
  return { id: data.id, name: data.name };
}

export async function deleteClub(id: string): Promise<void> {
  const { error } = await supabase.from('clubs').delete().eq('id', id);
  if (error) dbError(error, 'eliminar palo');
}

// ─── Shot Results (globales) ─────────────────────────────────────────────────

export async function getShotResults(): Promise<ShotResult[]> {
  const { data, error } = await supabase.from('shot_results').select('*').order('id');
  if (error) dbError(error, 'cargar resultados de golpe');
  return (data ?? []).map(r => ({ id: r.id, name: r.name }));
}

export async function addShotResult(name: string): Promise<ShotResult> {
  const { data, error } = await supabase.from('shot_results').insert({ name }).select().single();
  if (error) dbError(error, 'agregar resultado de golpe');
  return { id: data.id, name: data.name };
}

export async function deleteShotResult(id: string): Promise<void> {
  const { error } = await supabase.from('shot_results').delete().eq('id', id);
  if (error) dbError(error, 'eliminar resultado de golpe');
}

// ─── Courses (globales) ──────────────────────────────────────────────────────

export async function getCourses(): Promise<Course[]> {
  const { data, error } = await supabase.from('courses').select('*').order('created_at');
  if (error) dbError(error, 'cargar canchas');
  return (data ?? []).map(r => ({ id: r.id, name: r.name, numberOfHoles: r.number_of_holes }));
}

export async function addCourse(course: { name: string; numberOfHoles: number }): Promise<Course> {
  const { data, error } = await supabase
    .from('courses').insert({ name: course.name, number_of_holes: course.numberOfHoles }).select().single();
  if (error) dbError(error, 'agregar cancha');
  return { id: data.id, name: data.name, numberOfHoles: data.number_of_holes };
}

export async function updateCourse(course: Course): Promise<void> {
  const { error } = await supabase
    .from('courses').update({ name: course.name, number_of_holes: course.numberOfHoles }).eq('id', course.id);
  if (error) dbError(error, 'actualizar cancha');
}

export async function deleteCourse(id: string): Promise<void> {
  await supabase.from('course_holes').delete().eq('course_id', id);
  const { error } = await supabase.from('courses').delete().eq('id', id);
  if (error) dbError(error, 'eliminar cancha');
}

// ─── Course Holes (globales) ─────────────────────────────────────────────────

export async function getHolesForCourse(courseId: string): Promise<CourseHole[]> {
  const { data, error } = await supabase
    .from('course_holes').select('*').eq('course_id', courseId).order('hole_number');
  if (error) dbError(error, 'cargar hoyos');
  return (data ?? []).map(r => ({
    id: r.id, courseId: r.course_id, holeNumber: r.hole_number,
    par: r.par as 3 | 4 | 5, description: r.description ?? '', yards: r.yards ?? 0,
  }));
}

export async function saveHolesForCourse(courseId: string, holes: CourseHole[]): Promise<void> {
  await supabase.from('course_holes').delete().eq('course_id', courseId);
  if (holes.length === 0) return;
  const { error } = await supabase.from('course_holes').insert(
    holes.map(h => ({
      course_id: h.courseId, hole_number: h.holeNumber,
      par: h.par, description: h.description, yards: h.yards,
    }))
  );
  if (error) dbError(error, 'guardar hoyos');
}

// ─── Rounds ──────────────────────────────────────────────────────────────────

export async function getRounds(): Promise<Round[]> {
  const { data, error } = await supabase
    .from('rounds').select('*').order('created_at', { ascending: false });
  if (error) dbError(error, 'cargar rondas');
  return (data ?? []).map(toRound);
}

export async function getRound(id: string): Promise<Round | null> {
  const { data, error } = await supabase.from('rounds').select('*').eq('id', id).maybeSingle();
  if (error) dbError(error, 'cargar ronda');
  if (!data) return null;
  return toRound(data);
}

export async function addRound(data: Omit<Round, 'id' | 'createdAt'>): Promise<Round> {
  const { data: row, error } = await supabase.from('rounds').insert({
    date: data.date, course_id: data.courseId,
    holes_played: data.holesPlayed, status: data.status,
    owner_username: data.ownerUsername,
  }).select().single();
  if (error) dbError(error, 'crear ronda');
  return toRound(row);
}

export async function updateRound(round: Round): Promise<void> {
  const { error } = await supabase.from('rounds').update({
    date: round.date, course_id: round.courseId,
    holes_played: round.holesPlayed, status: round.status,
  }).eq('id', round.id);
  if (error) dbError(error, 'actualizar ronda');
}

function toRound(r: Record<string, unknown>): Round {
  return {
    id: r.id as string, date: r.date as string, courseId: r.course_id as string,
    holesPlayed: r.holes_played as 9 | 18, status: r.status as 'in_progress' | 'completed',
    ownerUsername: r.owner_username as string, createdAt: r.created_at as string,
  };
}

// ─── Rounds for user ─────────────────────────────────────────────────────────

export async function getRoundsForUser(username: string): Promise<{ rounds: Round[]; roundPlayers: RoundPlayer[] }> {
  const { data: rps, error: rpsErr } = await supabase
    .from('round_players').select('*').eq('username', username);
  if (rpsErr) dbError(rpsErr, 'cargar rondas del usuario');

  const roundIds = (rps ?? []).map(r => r.round_id as string);
  if (roundIds.length === 0) return { rounds: [], roundPlayers: [] };

  // fetch all players for those rounds (to show participant names)
  const { data: allRps, error: allRpsErr } = await supabase
    .from('round_players').select('*').in('round_id', roundIds);
  if (allRpsErr) dbError(allRpsErr, 'cargar jugadores de rondas');

  const { data: roundsData, error: roundsErr } = await supabase
    .from('rounds').select('*').in('id', roundIds).order('date', { ascending: false });
  if (roundsErr) dbError(roundsErr, 'cargar rondas');

  return {
    rounds: (roundsData ?? []).map(toRound),
    roundPlayers: (allRps ?? []).map(toRoundPlayer),
  };
}

// ─── Leave / delete round ────────────────────────────────────────────────────

export async function leaveRound(roundId: string, username: string): Promise<void> {
  // Delete all data for this user in this round
  await Promise.all([
    supabase.from('hole_scores').delete().eq('round_id', roundId).eq('username', username),
    supabase.from('hole_stats').delete().eq('round_id', roundId).eq('username', username),
    supabase.from('shots').delete().eq('round_id', roundId).eq('username', username),
  ]);
  await supabase.from('round_players').delete().eq('round_id', roundId).eq('username', username);

  // If no players remain, delete the round itself
  const { data: remaining } = await supabase
    .from('round_players').select('id').eq('round_id', roundId).limit(1);
  if (!remaining || remaining.length === 0) {
    await supabase.from('rounds').delete().eq('id', roundId);
  }
}

// ─── Round Players ────────────────────────────────────────────────────────────

export async function getRoundPlayersForRound(roundId: string): Promise<RoundPlayer[]> {
  const { data, error } = await supabase.from('round_players').select('*').eq('round_id', roundId);
  if (error) dbError(error, 'cargar jugadores de la ronda');
  return (data ?? []).map(toRoundPlayer);
}

export async function getAllRoundPlayers(): Promise<RoundPlayer[]> {
  const { data, error } = await supabase.from('round_players').select('*');
  if (error) dbError(error, 'cargar todos los jugadores');
  return (data ?? []).map(toRoundPlayer);
}

export async function addRoundPlayers(rps: Omit<RoundPlayer, 'id'>[]): Promise<RoundPlayer[]> {
  const { data, error } = await supabase.from('round_players').insert(
    rps.map(r => ({ round_id: r.roundId, username: r.username, tracking_level: r.trackingLevel }))
  ).select();
  if (error) dbError(error, 'agregar jugadores a la ronda');
  return (data ?? []).map(toRoundPlayer);
}

export async function removePlayerFromRound(roundId: string, username: string): Promise<void> {
  await Promise.all([
    supabase.from('round_players').delete().eq('round_id', roundId).eq('username', username),
    supabase.from('hole_scores').delete().eq('round_id', roundId).eq('username', username),
    supabase.from('hole_stats').delete().eq('round_id', roundId).eq('username', username),
    supabase.from('shots').delete().eq('round_id', roundId).eq('username', username),
  ]);
}

function toRoundPlayer(r: Record<string, unknown>): RoundPlayer {
  return {
    id: r.id as string, roundId: r.round_id as string, username: r.username as string,
    trackingLevel: r.tracking_level as 'score' | 'stats' | 'shots',
  };
}

// ─── Hole Scores ──────────────────────────────────────────────────────────────

export async function getHoleScoresForRound(roundId: string): Promise<HoleScore[]> {
  const { data, error } = await supabase.from('hole_scores').select('*').eq('round_id', roundId);
  if (error) dbError(error, 'cargar scores');
  return (data ?? []).map(r => ({
    id: r.id, roundId: r.round_id, username: r.username,
    holeNumber: r.hole_number, strokes: r.strokes,
  }));
}

export async function upsertHoleScore(score: Omit<HoleScore, 'id'>): Promise<void> {
  const { error } = await supabase.from('hole_scores').upsert(
    { round_id: score.roundId, username: score.username, hole_number: score.holeNumber, strokes: score.strokes },
    { onConflict: 'round_id,username,hole_number' }
  );
  if (error) dbError(error, 'guardar score del hoyo');
}

// ─── Hole Stats ───────────────────────────────────────────────────────────────

export async function getHoleStatsForRound(roundId: string): Promise<HoleStats[]> {
  const { data, error } = await supabase.from('hole_stats').select('*').eq('round_id', roundId);
  if (error) dbError(error, 'cargar estadísticas');
  return (data ?? []).map(toHoleStats);
}

export async function getHoleStatsForPlayer(
  roundId: string, username: string, holeNumber: number
): Promise<HoleStats | null> {
  const { data, error } = await supabase.from('hole_stats').select('*')
    .eq('round_id', roundId).eq('username', username).eq('hole_number', holeNumber).maybeSingle();
  if (error) dbError(error, 'cargar estadísticas del hoyo');
  if (!data) return null;
  return toHoleStats(data);
}

export async function upsertHoleStats(stats: HoleStats | Omit<HoleStats, 'id'>): Promise<void> {
  const { error } = await supabase.from('hole_stats').upsert(
    {
      round_id: stats.roundId, username: stats.username, hole_number: stats.holeNumber,
      strokes: stats.strokes, fairway_hit: stats.fairwayHit, green_hit: stats.greenHit,
      in_bunker: stats.inBunker, penalty: stats.penalty, putts: stats.putts, gir: stats.gir,
    },
    { onConflict: 'round_id,username,hole_number' }
  );
  if (error) dbError(error, 'guardar estadísticas del hoyo');
}

function toHoleStats(r: Record<string, unknown>): HoleStats {
  return {
    id: r.id as string, roundId: r.round_id as string, username: r.username as string,
    holeNumber: r.hole_number as number, strokes: r.strokes as number,
    fairwayHit: r.fairway_hit as boolean | null, greenHit: r.green_hit as boolean | null,
    inBunker: r.in_bunker as boolean, penalty: r.penalty as boolean,
    putts: r.putts as number, gir: r.gir as boolean,
  };
}

// ─── Shots ────────────────────────────────────────────────────────────────────

export async function getShotsForRound(roundId: string): Promise<Shot[]> {
  const { data, error } = await supabase.from('shots').select('*').eq('round_id', roundId)
    .order('hole_number').order('shot_number');
  if (error) dbError(error, 'cargar tiros de la ronda');
  return (data ?? []).map(toShot);
}

export async function getShotsForHole(roundId: string, username: string, holeNumber: number): Promise<Shot[]> {
  const { data, error } = await supabase.from('shots').select('*')
    .eq('round_id', roundId).eq('username', username).eq('hole_number', holeNumber).order('shot_number');
  if (error) dbError(error, 'cargar tiros del hoyo');
  return (data ?? []).map(toShot);
}

export async function addShot(shot: Omit<Shot, 'id'>): Promise<Shot> {
  const { data, error } = await supabase.from('shots').insert({
    round_id: shot.roundId, username: shot.username, hole_number: shot.holeNumber,
    shot_number: shot.shotNumber, club_id: shot.clubId || null,
    start_position: shot.startPosition, result: shot.result,
    yards: shot.yards, is_penalty: shot.isPenalty,
  }).select().single();
  if (error) dbError(error, 'agregar tiro');
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
  if (error) dbError(error, 'actualizar tiro');
}

export async function deleteShot(id: string): Promise<void> {
  const { error } = await supabase.from('shots').delete().eq('id', id);
  if (error) dbError(error, 'eliminar tiro');
}

export async function deleteShotsForHole(roundId: string, username: string, holeNumber: number): Promise<void> {
  const { error } = await supabase.from('shots').delete()
    .eq('round_id', roundId).eq('username', username).eq('hole_number', holeNumber);
  if (error) dbError(error, 'eliminar tiros del hoyo');
}

function toShot(r: Record<string, unknown>): Shot {
  return {
    id: r.id as string, roundId: r.round_id as string, username: r.username as string,
    holeNumber: r.hole_number as number, shotNumber: r.shot_number as number,
    clubId: (r.club_id as string) ?? '', startPosition: r.start_position as string,
    result: r.result as string, yards: r.yards as number, isPenalty: r.is_penalty as boolean,
  };
}

// ─── Dashboard data ───────────────────────────────────────────────────────────

export interface UserRoundData {
  rounds: Round[];
  holeScores: HoleScore[];
  holeStats: HoleStats[];
  shots: Shot[];
  clubs: Club[];
  courses: Course[];
  courseHoles: CourseHole[];
}

export async function getUserRoundData(username: string): Promise<UserRoundData> {
  // Get round IDs where user participated
  const { data: rps, error: rpsErr } = await supabase
    .from('round_players').select('round_id').eq('username', username);
  if (rpsErr) dbError(rpsErr, 'cargar datos del dashboard');

  const roundIds = (rps ?? []).map(r => r.round_id as string);

  if (roundIds.length === 0) {
    const [{ data: courses }, { data: clubsData }] = await Promise.all([
      supabase.from('courses').select('*').order('created_at'),
      supabase.from('clubs').select('*').order('created_at'),
    ]);
    return {
      rounds: [], holeScores: [], holeStats: [], shots: [],
      clubs: (clubsData ?? []).map(r => ({ id: r.id, name: r.name })),
      courses: (courses ?? []).map(c => ({ id: c.id, name: c.name, numberOfHoles: c.number_of_holes })),
      courseHoles: [],
    };
  }

  const [
    { data: roundsData },
    { data: scoresData },
    { data: statsData },
    { data: shotsData },
    { data: coursesData },
    { data: clubsData },
  ] = await Promise.all([
    supabase.from('rounds').select('*').in('id', roundIds).order('date', { ascending: false }),
    supabase.from('hole_scores').select('*').eq('username', username).in('round_id', roundIds),
    supabase.from('hole_stats').select('*').eq('username', username).in('round_id', roundIds),
    supabase.from('shots').select('*').eq('username', username).in('round_id', roundIds),
    supabase.from('courses').select('*').order('created_at'),
    supabase.from('clubs').select('*').order('created_at'),
  ]);

  const rounds = (roundsData ?? []).map(toRound);
  const courseIds = Array.from(new Set(rounds.map(r => r.courseId)));
  const { data: holesData } = await supabase.from('course_holes').select('*').in('course_id', courseIds);

  return {
    rounds,
    holeScores: (scoresData ?? []).map(r => ({
      id: r.id, roundId: r.round_id, username: r.username,
      holeNumber: r.hole_number, strokes: r.strokes,
    })),
    holeStats: (statsData ?? []).map(toHoleStats),
    shots: (shotsData ?? []).map(toShot),
    clubs: (clubsData ?? []).map(r => ({ id: r.id, name: r.name })),
    courses: (coursesData ?? []).map(c => ({ id: c.id, name: c.name, numberOfHoles: c.number_of_holes })),
    courseHoles: (holesData ?? []).map(r => ({
      id: r.id, courseId: r.course_id, holeNumber: r.hole_number,
      par: r.par as 3 | 4 | 5, description: r.description ?? '', yards: r.yards ?? 0,
    })),
  };
}
