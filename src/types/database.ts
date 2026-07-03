export type SubscriptionTier = 'free' | 'basic' | 'pro' | 'enterprise';
export type UserStatus = 'active' | 'suspended' | 'deleted';
export type ProjectStatus = 'draft' | 'processing' | 'ready' | 'archived';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing';
export type TransactionStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';
export type AdminRole = 'super_admin' | 'admin' | 'support' | 'viewer';

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  subscription_tier: SubscriptionTier;
  credits_remaining: number;
  credits_used: number;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  model_url?: string;
  thumbnail_url?: string;
  scene_data: Record<string, any>;
  settings: Record<string, any>;
  status: ProjectStatus;
  is_public: boolean;
  view_count: number;
  last_modified: string;
  created_at: string;
}

export interface ProjectHistory {
  id: string;
  project_id: string;
  command: Record<string, any>;
  created_at: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  price_monthly?: number;
  price_yearly?: number;
  currency: string;
  credits_per_month?: number;
  max_projects?: number;
  max_storage_gb?: number;
  features?: Record<string, any>;
  stripe_price_id_monthly?: string;
  stripe_price_id_yearly?: string;
  is_active: boolean;
  created_at: string;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  status: SubscriptionStatus;
  current_period_start?: string;
  current_period_end?: string;
  cancel_at_period_end: boolean;
  trial_ends_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  user_subscription_id?: string;
  stripe_session_id?: string;
  stripe_payment_intent_id?: string;
  amount?: number;
  currency: string;
  status: TransactionStatus;
  description?: string;
  created_at: string;
}

export interface AssetCategory {
  id: string;
  name: string;
  parent_id?: string;
  icon?: string;
  created_at: string;
}

export interface Asset {
  id: string;
  name: string;
  category_id?: string;
  model_url: string;
  thumbnail_url?: string;
  preview_url?: string;
  dimensions?: Record<string, any>;
  tags?: string[];
  is_premium: boolean;
  created_by?: string;
  created_at: string;
}

export interface AdminRoleRecord {
  id: string;
  user_id: string;
  role: AdminRole;
  permissions: Record<string, any>;
  created_at: string;
  updated_at: string;
}
