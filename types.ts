export interface User {
  id: string;
  name: string;
  avatar: string;
}

export interface Task {
  id: string;
  childId: string;
  title: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
}

export interface Record {
  id: string;
  childId: string;
  taskId: string;
  status: 'done' | 'pass';
  reason?: string;
  date: string; // YYYY-MM-DD
}

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;
