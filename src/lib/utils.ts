import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

// Given a course with N holes, and we play M holes (M may be > N for 9-hole courses played twice),
// resolve the actual course hole number for a played hole number.
export function resolveHoleNumber(playedHole: number, courseHoles: number): number {
  return ((playedHole - 1) % courseHoles) + 1;
}

// Score formatting: returns css class based on score vs par
export function getScoreClass(score: number, par: number): string {
  const diff = score - par;
  if (diff <= -2) return 'score-eagle';
  if (diff === -1) return 'score-birdie';
  if (diff === 0) return 'score-par';
  if (diff === 1) return 'score-bogey';
  if (diff === 2) return 'score-double';
  return 'score-triple';
}
