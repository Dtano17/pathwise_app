/**
 * Stub for @southdevs/capacitor-google-auth for web builds
 * This prevents Vite from failing when the native module isn't available
 */

export interface GoogleAuthUser {
  id: string;
  email: string;
  name?: string;
  givenName?: string;
  familyName?: string;
  imageUrl?: string;
  authentication?: {
    idToken?: string;
    accessToken?: string;
  };
}

export interface GoogleAuthInitOptions {
  clientId?: string;
  scopes?: string[];
  grantOfflineAccess?: boolean;
}

export interface GoogleAuthRefreshResult {
  accessToken?: string;
}

export const GoogleAuth = {
  initialize: async (_options?: GoogleAuthInitOptions): Promise<void> => {
    console.log('[GOOGLE_AUTH_STUB] initialize called - no-op on web');
  },
  signIn: async (): Promise<GoogleAuthUser> => {
    throw new Error('Native Google Auth not available on web');
  },
  signOut: async (): Promise<void> => {
    console.log('[GOOGLE_AUTH_STUB] signOut called - no-op on web');
  },
  refresh: async (): Promise<GoogleAuthRefreshResult> => {
    throw new Error('Native Google Auth not available on web');
  },
};

export type User = GoogleAuthUser;
