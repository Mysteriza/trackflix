import { z } from 'zod';

export type WatchlistItemType = 'movie' | 'series';

export interface WatchlistItem {
  id: string;
  title: string;
  type: WatchlistItemType;
  userId: string;
  watched: boolean;
  watchedAt: number | null;
  createdAt: number;
  order: number;
  isD21: boolean;
  notes?: string;
  rating?: number | null;
  season?: number;
  episode?: number;
  normalizedTitle?: string;
}

export type WatchlistVisibility = 'public' | 'private';

export interface QuickAddItem {
  key: string;
  title: string;
  type: WatchlistItemType;
}

export const UserProfileSchema = z.object({
  displayName: z.string().min(3, "Display name must be at least 3 characters").max(20, "Display name must be 20 characters or less"),
  isPublic: z.boolean(),
});

export type UserProfileInput = z.infer<typeof UserProfileSchema>;

export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
    watchlistVisibility: WatchlistVisibility;
    createdAt?: number;
}