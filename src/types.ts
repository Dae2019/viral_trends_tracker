export interface Trend {
  id: string;
  topic: string;
  category: string;
  platform: 'X' | 'Twitter' | 'Facebook' | 'TikTok' | 'LinkedIn' | 'YouTube' | 'Instagram' | 'Reddit' | 'Kick' | 'Twitch';
  engagementRate: number; // e.g. 12.5%
  volume: number; // total post count, e.g. 245000
  growthPercentage: number; // e.g. 180 (for +180% growth)
  sentiment: 'positive' | 'neutral' | 'negative';
  description: string;
  isBreaking: boolean;
  viralityScore?: number; // e.g. calculated index representing trend power
}

export interface SocialPost {
  id: string;
  author: string;
  handle: string;
  platform: 'X' | 'Twitter' | 'Facebook' | 'TikTok' | 'LinkedIn' | 'YouTube' | 'Instagram' | 'Reddit' | 'Kick' | 'Twitch';
  avatar: string; // fallback / placeholder URL or symbol
  content: string;
  timestamp: string; // formatted time, e.g. "2h ago"
  likes: number;
  shares: number;
  comments: number;
  views?: number;
  engagementRate: number;
  category: string;
  mediaType?: 'text' | 'image' | 'video';
  mediaUrl?: string;
}

export interface CategoryDistribution {
  name: string;
  value: number; // percentage
  count: number;
  color: string;
}

export interface BreakingAlert {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  category: string;
  platform: string;
  severity: 'high' | 'medium' | 'info';
  isRead: boolean;
}

export interface UserPreferences {
  preferredPlatforms: string[];
  preferredCategories: string[];
  minEngagementRate: number; // 0 to 20%
  refreshInterval: number; // in seconds or minutes
  enableNotifications: boolean;
  enableSound: boolean;
}

export interface DashboardStats {
  totalVolume: number;
  avgEngagement: number;
  activeTrendsCount: number;
  breakingAlertsCount: number;
}
