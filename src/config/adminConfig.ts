// Dynamic Admin Configuration (No hardcoded credentials)
// All authorized admin emails and credentials are now dynamically queried from Firestore `admins` collection.

export interface AdminUser {
  email: string;
  name?: string;
  role?: 'superadmin' | 'admin' | 'viewer';
  addedAt?: string;
  addedBy?: string;
}

export const DEFAULT_ADMIN_COLLECTION = 'admins';
