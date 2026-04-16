export type MembershipRole = "CAPTAIN" | "PLAYER";

export type Team = {
  id: string;
  name: string;
  slug: string;
  sport: string;
  city: string;
  captainId: string;
  inviteCode: string;
  createdAt: string;
  updatedAt: string;
};

export type TeamMembership = {
  id: string;
  teamId: string;
  userId: string;
  role: MembershipRole;
  joinedAt: string;
  isActive: boolean;
};

export type TeamDetails = Team & {
  members: Array<{
    membershipId: string;
    userId: string;
    fullName: string;
    phone: string;
    reliabilityScore: number;
    role: MembershipRole;
    joinedAt: string;
  }>;
};
