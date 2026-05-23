import { Player, Club, ShotResult, Course, CourseHole, Round, RoundPlayer, HoleScore, HoleStats, Shot } from './types';
import { DEFAULT_PLAYERS, DEFAULT_CLUBS, DEFAULT_SHOT_RESULTS } from './defaults';

const KEYS = {
  INITIALIZED: 'gt_initialized',
  SESSION: 'gt_session',
  PLAYERS: 'gt_players',
  CLUBS: 'gt_clubs',
  SHOT_RESULTS: 'gt_shot_results',
  COURSES: 'gt_courses',
  COURSE_HOLES: 'gt_course_holes',
  ROUNDS: 'gt_rounds',
  ROUND_PLAYERS: 'gt_round_players',
  HOLE_SCORES: 'gt_hole_scores',
  HOLE_STATS: 'gt_hole_stats',
  SHOTS: 'gt_shots',
};

function getItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('localStorage error:', e);
  }
}

export function initializeDefaults(): void {
  if (getItem<boolean>(KEYS.INITIALIZED, false)) return;
  setItem(KEYS.PLAYERS, DEFAULT_PLAYERS);
  setItem(KEYS.CLUBS, DEFAULT_CLUBS);
  setItem(KEYS.SHOT_RESULTS, DEFAULT_SHOT_RESULTS);
  setItem(KEYS.COURSES, []);
  setItem(KEYS.COURSE_HOLES, []);
  setItem(KEYS.ROUNDS, []);
  setItem(KEYS.ROUND_PLAYERS, []);
  setItem(KEYS.HOLE_SCORES, []);
  setItem(KEYS.HOLE_STATS, []);
  setItem(KEYS.SHOTS, []);
  setItem(KEYS.INITIALIZED, true);
}

// Session
export function getSession(): boolean {
  return getItem<boolean>(KEYS.SESSION, false);
}
export function saveSession(value: boolean): void {
  setItem(KEYS.SESSION, value);
}

// Players
export function getPlayers(): Player[] {
  return getItem<Player[]>(KEYS.PLAYERS, []);
}
export function savePlayers(players: Player[]): void {
  setItem(KEYS.PLAYERS, players);
}
export function addPlayer(player: Player): void {
  savePlayers([...getPlayers(), player]);
}
export function deletePlayer(id: string): void {
  savePlayers(getPlayers().filter(p => p.id !== id));
}

// Clubs
export function getClubs(): Club[] {
  return getItem<Club[]>(KEYS.CLUBS, []);
}
export function saveClubs(clubs: Club[]): void {
  setItem(KEYS.CLUBS, clubs);
}
export function addClub(club: Club): void {
  saveClubs([...getClubs(), club]);
}
export function deleteClub(id: string): void {
  saveClubs(getClubs().filter(c => c.id !== id));
}

// Shot Results
export function getShotResults(): ShotResult[] {
  return getItem<ShotResult[]>(KEYS.SHOT_RESULTS, []);
}
export function saveShotResults(results: ShotResult[]): void {
  setItem(KEYS.SHOT_RESULTS, results);
}

// Courses
export function getCourses(): Course[] {
  return getItem<Course[]>(KEYS.COURSES, []);
}
export function saveCourses(courses: Course[]): void {
  setItem(KEYS.COURSES, courses);
}
export function addCourse(course: Course): void {
  saveCourses([...getCourses(), course]);
}
export function updateCourse(course: Course): void {
  saveCourses(getCourses().map(c => c.id === course.id ? course : c));
}
export function deleteCourse(id: string): void {
  saveCourses(getCourses().filter(c => c.id !== id));
  saveCourseHoles(getCourseHoles().filter(h => h.courseId !== id));
}

// Course Holes
export function getCourseHoles(): CourseHole[] {
  return getItem<CourseHole[]>(KEYS.COURSE_HOLES, []);
}
export function saveCourseHoles(holes: CourseHole[]): void {
  setItem(KEYS.COURSE_HOLES, holes);
}
export function getHolesForCourse(courseId: string): CourseHole[] {
  return getCourseHoles().filter(h => h.courseId === courseId).sort((a, b) => a.holeNumber - b.holeNumber);
}
export function saveHolesForCourse(courseId: string, holes: CourseHole[]): void {
  const allHoles = getCourseHoles().filter(h => h.courseId !== courseId);
  saveCourseHoles([...allHoles, ...holes]);
}

// Rounds
export function getRounds(): Round[] {
  return getItem<Round[]>(KEYS.ROUNDS, []);
}
export function saveRounds(rounds: Round[]): void {
  setItem(KEYS.ROUNDS, rounds);
}
export function getRound(id: string): Round | undefined {
  return getRounds().find(r => r.id === id);
}
export function addRound(round: Round): void {
  saveRounds([...getRounds(), round]);
}
export function updateRound(round: Round): void {
  saveRounds(getRounds().map(r => r.id === round.id ? round : r));
}

// Round Players
export function getRoundPlayers(): RoundPlayer[] {
  return getItem<RoundPlayer[]>(KEYS.ROUND_PLAYERS, []);
}
export function saveRoundPlayers(rps: RoundPlayer[]): void {
  setItem(KEYS.ROUND_PLAYERS, rps);
}
export function getRoundPlayersForRound(roundId: string): RoundPlayer[] {
  return getRoundPlayers().filter(rp => rp.roundId === roundId);
}
export function addRoundPlayers(rps: RoundPlayer[]): void {
  saveRoundPlayers([...getRoundPlayers(), ...rps]);
}
export function updateRoundPlayer(rp: RoundPlayer): void {
  saveRoundPlayers(getRoundPlayers().map(r => r.id === rp.id ? rp : r));
}

// Remove a player from a round (deletes all their data for that round)
export function removePlayerFromRound(roundId: string, playerId: string): void {
  saveRoundPlayers(getRoundPlayers().filter(rp => !(rp.roundId === roundId && rp.playerId === playerId)));
  saveHoleScores(getHoleScores().filter(s => !(s.roundId === roundId && s.playerId === playerId)));
  saveHoleStatsAll(getHoleStatsAll().filter(s => !(s.roundId === roundId && s.playerId === playerId)));
  saveShots(getShots().filter(s => !(s.roundId === roundId && s.playerId === playerId)));
}

// Hole Scores
export function getHoleScores(): HoleScore[] {
  return getItem<HoleScore[]>(KEYS.HOLE_SCORES, []);
}
export function saveHoleScores(scores: HoleScore[]): void {
  setItem(KEYS.HOLE_SCORES, scores);
}
export function getHoleScoresForRound(roundId: string): HoleScore[] {
  return getHoleScores().filter(s => s.roundId === roundId);
}
export function upsertHoleScore(score: HoleScore): void {
  const all = getHoleScores();
  const idx = all.findIndex(s => s.roundId === score.roundId && s.playerId === score.playerId && s.holeNumber === score.holeNumber);
  if (idx >= 0) {
    all[idx] = score;
  } else {
    all.push(score);
  }
  saveHoleScores(all);
}

// Hole Stats
export function getHoleStatsAll(): HoleStats[] {
  return getItem<HoleStats[]>(KEYS.HOLE_STATS, []);
}
export function saveHoleStatsAll(stats: HoleStats[]): void {
  setItem(KEYS.HOLE_STATS, stats);
}
export function getHoleStatsForRound(roundId: string): HoleStats[] {
  return getHoleStatsAll().filter(s => s.roundId === roundId);
}
export function getHoleStatsForPlayer(roundId: string, playerId: string, holeNumber: number): HoleStats | undefined {
  return getHoleStatsAll().find(s => s.roundId === roundId && s.playerId === playerId && s.holeNumber === holeNumber);
}
export function upsertHoleStats(stats: HoleStats): void {
  const all = getHoleStatsAll();
  const idx = all.findIndex(s => s.roundId === stats.roundId && s.playerId === stats.playerId && s.holeNumber === stats.holeNumber);
  if (idx >= 0) {
    all[idx] = stats;
  } else {
    all.push(stats);
  }
  saveHoleStatsAll(all);
}

// Shots
export function getShots(): Shot[] {
  return getItem<Shot[]>(KEYS.SHOTS, []);
}
export function saveShots(shots: Shot[]): void {
  setItem(KEYS.SHOTS, shots);
}
export function getShotsForRound(roundId: string): Shot[] {
  return getShots().filter(s => s.roundId === roundId);
}
export function getShotsForHole(roundId: string, playerId: string, holeNumber: number): Shot[] {
  return getShots()
    .filter(s => s.roundId === roundId && s.playerId === playerId && s.holeNumber === holeNumber)
    .sort((a, b) => a.shotNumber - b.shotNumber);
}
export function addShot(shot: Shot): void {
  saveShots([...getShots(), shot]);
}
export function deleteShot(id: string): void {
  saveShots(getShots().filter(s => s.id !== id));
}
export function deleteShotsForHole(roundId: string, playerId: string, holeNumber: number): void {
  saveShots(getShots().filter(s => !(s.roundId === roundId && s.playerId === playerId && s.holeNumber === holeNumber)));
}
