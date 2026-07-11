// src/types/index.ts

export type Role = 'ADMIN' | 'LIDER' | 'JOVEN';

export interface UserProfile {
  id: string;
  user_id: string;
  role_id: string;
  role_name?: string; // Populated via join: 'ADMIN' | 'LIDER' | 'JOVEN'
  first_name: string;
  last_name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Devotional {
  id: string;
  title: string;
  content: string;
  author_id: string;
  published_date: string;
  created_at: string;
}

export interface DevotionalCompletion {
  id: string;
  devotional_id: string;
  user_id: string;
  completed_at: string;
  image_url?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  feedback?: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface PrayerRequest {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: 'OPEN' | 'ANSWERED' | 'CLOSED';
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  event_date: string;
  location: string;
  created_by: string;
  created_at: string;
}
