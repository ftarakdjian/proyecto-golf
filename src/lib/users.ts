export type UserRole = 'player' | 'admin';

export const USERS: Record<string, { password: string; role: UserRole }> = {
  Nacho:     { password: 'river99',   role: 'player' },
  Marcelito: { password: 'river99',   role: 'player' },
  Chechu:    { password: 'river99',   role: 'admin'  },
  Coco:      { password: 'william99', role: 'player' },
  Feli:      { password: 'timon99',   role: 'player' },
  Quine:     { password: 'manya98',   role: 'player' },
};

export const USER_NAMES = Object.keys(USERS);
