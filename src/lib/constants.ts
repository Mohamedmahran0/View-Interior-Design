export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  SUPPORT: 'support',
  VIEWER: 'viewer',
} as const;

export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  BASIC: 'basic',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
} as const;

export const PROJECT_STATUS = {
  DRAFT: 'draft',
  PROCESSING: 'processing',
  READY: 'ready',
  ARCHIVED: 'archived',
} as const;

export const CREDITS = {
  FREE: 5,
  BASIC: 50,
  PRO: 200,
  ENTERPRISE: 999999,
} as const;

export const MAX_PROJECTS = {
  FREE: 1,
  BASIC: 10,
  PRO: 999999,
  ENTERPRISE: 999999,
} as const;

export const PLANS = {
  FREE: { name: 'Free', price: 0, credits: 5, maxProjects: 1, storageGB: 0.5 },
  BASIC: { name: 'Basic', price: 19, credits: 50, maxProjects: 10, storageGB: 5 },
  PRO: { name: 'Pro', price: 49, credits: 200, maxProjects: -1, storageGB: 50 },
  ENTERPRISE: { name: 'Enterprise', price: 199, credits: -1, maxProjects: -1, storageGB: 500 },
} as const;

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  PRICING: '/pricing',
  GALLERY: '/gallery',
  DASHBOARD: '/dashboard',
  PROJECTS: '/projects',
  EDITOR: '/editor',
  ACCOUNT: '/account',
  BILLING: '/account/billing',
  SETTINGS: '/account/settings',
  SEARCH: '/search',
  RESET_PASSWORD: '/reset-password',
  ADMIN: {
    LOGIN: '/admin/login',
    DASHBOARD: '/admin/dashboard',
    USERS: '/admin/users',
    SUBSCRIPTIONS: '/admin/subscriptions',
    TRANSACTIONS: '/admin/transactions',
    PROJECTS: '/admin/projects',
    ASSETS: '/admin/assets',
    SETTINGS: '/admin/settings',
  },
} as const;

export const STORAGE_BUCKETS = {
  PROJECTS: 'projects',
  ASSETS: 'assets',
  AVATARS: 'avatars',
  THUMBNAILS: 'thumbnails',
} as const;
