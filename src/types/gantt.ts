export type ZoomLevel = 'days' | 'weeks' | 'months';
export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface Task {
  id: string;
  parentId: string; // Feature ID
  name: string;
  startDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  duration: number; // calculated in days
  status?: TaskStatus;
  color?: string; // Optional hex color override
}

export interface Feature {
  id: string;
  parentId: string; // Project ID
  name: string;
  collapsed: boolean;
  startDate: string; // YYYY-MM-DD (min of children)
  dueDate: string; // YYYY-MM-DD (max of children)
  duration: number; // in days
  tasks: Task[]; // Inlined or reference task ids. Let's store taskIds for Zustand performance, or inline them. Storing taskIds in Features makes lookups super simple, and we can keep tasks in a flat record.
  taskIds: string[];
  color?: string; // Optional feature color class name or hex code
}

export interface Project {
  id: string;
  name: string;
  collapsed: boolean;
  startDate: string; // YYYY-MM-DD (min of children)
  dueDate: string; // YYYY-MM-DD (max of children)
  duration: number; // in days
  featureIds: string[];
  color?: string; // Optional project color class name or hex code
}

export type GanttItemType = 'project' | 'feature' | 'task';

export interface FlatRow {
  id: string;
  type: GanttItemType;
  name: string;
  level: number; // indentation level: 0 for project, 1 for feature, 2 for task
  collapsed?: boolean;
  parentId?: string;
  startDate: string;
  dueDate: string;
  duration: number;
  color?: string;
  status?: TaskStatus;
}
