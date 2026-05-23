import { Player, Club, ShotResult } from './types';

export const DEFAULT_PLAYERS: Player[] = [
  { id: 'p1', name: 'Marcelo', createdAt: new Date().toISOString() },
  { id: 'p2', name: 'Nacho', createdAt: new Date().toISOString() },
  { id: 'p3', name: 'Facu', createdAt: new Date().toISOString() },
];

export const DEFAULT_CLUBS: Club[] = [
  { id: 'c1', name: 'Driver' },
  { id: 'c2', name: 'Madera 3' },
  { id: 'c3', name: 'Híbrido 4' },
  { id: 'c4', name: 'H5' },
  { id: 'c5', name: 'H6' },
  { id: 'c6', name: 'H7' },
  { id: 'c7', name: 'H8' },
  { id: 'c8', name: 'H9' },
  { id: 'c9', name: 'PW' },
  { id: 'c10', name: 'AW' },
  { id: 'c11', name: 'SW' },
  { id: 'c12', name: 'Putter' },
];

export const DEFAULT_SHOT_RESULTS: ShotResult[] = [
  { id: 'r1', name: 'Fairway' },
  { id: 'r2', name: 'Green' },
  { id: 'r3', name: 'Rough' },
  { id: 'r4', name: 'Bunker' },
  { id: 'r5', name: 'Hoyo' },
  { id: 'r6', name: 'Agua' },
  { id: 'r7', name: 'Fuera de límites' },
];
