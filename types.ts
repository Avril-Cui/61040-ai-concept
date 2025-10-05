/**
 * Type definitions for AdaptiveSchedule concept
 *
 * This file contains all state variable types used across the concept implementation.
 */

// Generic type for User
export type User = string;

// Task structure from TaskCatalog concept
export interface Task {
  owner: User;
  taskId: string;
  taskName: string;
  category: string;
  duration: number; // in minutes
  priority: number; // 1-5 scale, where 1 = highest priority (critical), 5 = lowest priority (optional)
  splittable: boolean; // can task be split across multiple blocks
  timeBlockSet?: string[]; // optional set of timeBlockIds
  deadline?: string; // optional ISO timestamp
  slack?: string; // optional buffer margin for acceptable deviation
  preDependence?: Task[]; // optional tasks that it depends on
  postDependence?: Task[]; // optional tasks that depend on it
  note?: string; // optional notes
}

/**
 * Priority Scale:
 * 1 - Critical: Must be done ASAP (urgent deadlines, emergencies)
 * 2 - Important: Should be done soon (upcoming deadlines, high impact)
 * 3 - Regular: Necessary but not urgent
 * 4 - Low: Can be done later
 * 5 - Optional: Can be done if time permits (not time-sensitive or important)
 */

// TimeBlock structure from ScheduleTime concept
export interface TimeBlock {
  timeBlockId: string;
  owner: User;
  start: string; // ISO timestamp
  end: string; // ISO timestamp
  taskIdSet: string[]; // set of task IDs
}

// Session structure from RoutineLog concept
export interface Session {
  owner: User;
  sessionName: string;
  sessionId: string;
  isPaused: boolean;
  isActive: boolean;
  start?: string; // optional ISO timestamp
  end?: string; // optional ISO timestamp
  linkedTask?: Task; // optional linked task
  interruptReason?: string; // optional interruption reason
}

// Schedule is a collection of TimeBlocks
export type Schedule = TimeBlock[];

// Routine is a collection of Sessions
export type Routine = Session[];

// User preferences for scheduling
export interface Preference {
  preferences: string[]; // list of scheduling preferences
}

// AdaptiveBlock represents a time block with assigned tasks
export interface AdaptiveBlock {
  timeBlockId: string;
  owner: User;
  start: string; // ISO timestamp
  end: string; // ISO timestamp
  taskSet: Task[]; // tasks assigned to this block
}
