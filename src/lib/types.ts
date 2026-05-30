export interface Club {
  id: string;
  name: string;
}

export interface ShotResult {
  id: string;
  name: string;
}

export interface Course {
  id: string;
  name: string;
  numberOfHoles: number;
}

export interface CourseHole {
  id: string;
  courseId: string;
  holeNumber: number;
  par: 3 | 4 | 5;
  description: string;
  yards: number;
}

export interface Round {
  id: string;
  date: string;
  courseId: string;
  holesPlayed: 9 | 18;
  status: 'in_progress' | 'completed';
  ownerUsername: string;
  createdAt: string;
}

export interface RoundPlayer {
  id: string;
  roundId: string;
  username: string;
  trackingLevel: 'score' | 'stats' | 'shots';
}

export interface HoleScore {
  id: string;
  roundId: string;
  username: string;
  holeNumber: number;
  strokes: number;
}

export interface HoleStats {
  id: string;
  roundId: string;
  username: string;
  holeNumber: number;
  strokes: number;
  fairwayHit: boolean | null;
  greenHit: boolean | null;
  inBunker: boolean;
  penalty: boolean;
  putts: number;
  gir: boolean;
}

export interface Shot {
  id: string;
  roundId: string;
  username: string;
  holeNumber: number;
  shotNumber: number;
  clubId: string;
  startPosition: string;
  result: string;
  yards: number;
  isPenalty: boolean;
}
