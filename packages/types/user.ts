export type UserRole = "captain" | "player";

export type UserProfile = {
  id: string;
  phone: string;
  fullName: string;
  displayName: string;
  avatarUrl: string | null;
  defaultSport: string | null;
  city: string | null;
  reliabilityScore: number;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
};

export type OtpRequestPayload = {
  phone: string;
  fullName?: string;
};

export type AuthState = {
  profile: UserProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
};
