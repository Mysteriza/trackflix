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
  folderId: string | null;
  isD21: boolean;
  notes?: string;
  rating?: number | null;
  season?: number;
  episode?: number;
  normalizedTitle?: string;
}

export interface WatchlistFolder {
  id: string;
  name: string;
  userId: string;
  order: number;
  createdAt: number;
}

export interface QuickAddItem {
  key: string;
  title: string;
  type: WatchlistItemType;
}

export const UserProfileSchema = z.object({
  displayName: z.string().min(3, "Display name must be at least 3 characters").max(20, "Display name must be 20 characters or less"),
  isPublic: z.boolean(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;