// API response types
import { Plan } from '@/types/enum/plan';

export interface DocumentResponse {
  documentId: string;
  storyId: string;
  title: string;
  body: string;
  predecessorId: string | null;
  successorId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoryResponse {
  storyId: string;
  worldId: string;
  title: string;
  predecessorId: string | null;
  successorId: string | null;
  documents: DocumentResponse[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WorldResponse {
  worldId: string;
  userId: string;
  title: string;
  stories: StoryResponse[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginResponse {
  email: string;
  userId: string;
  plan: Plan | null;
  firstName: string;
  lastName: string;
  legacy: WorldResponse[];
  token: string;
}

export interface UserResponse {
  email: string;
  firstName: string;
  lastName: string;
  plan: Plan | null;
  genres: string[];
  userId: string;
}
