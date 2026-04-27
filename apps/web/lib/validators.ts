import { z } from "zod";

const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[1-9]\d{9,14}$/, "Enter a valid phone number.");

const optionalDateTime = z
  .string()
  .datetime()
  .optional()
  .nullable();

export const otpSchema = z.object({
  phone: phoneSchema,
  fullName: z.string().trim().min(2).max(80).optional(),
});

export const authProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  displayName: z.string().trim().min(2).max(80).optional(),
  defaultSport: z.string().trim().max(40).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  role: z.enum(["captain", "player"]).optional(),
  upiId: z.string().trim().max(50).optional().nullable(),
  upiName: z.string().trim().max(80).optional().nullable(),
});

export const createTeamSchema = z.object({
  name: z.string().trim().min(3).max(80),
  sport: z.string().trim().min(2).max(40),
  city: z.string().trim().min(2).max(80),
});

export const joinTeamSchema = z
  .object({
    teamId: z.string().uuid().optional(),
    inviteCode: z.string().trim().min(4).max(20).optional(),
  })
  .refine((value) => Boolean(value.teamId || value.inviteCode), {
    message: "Provide a team ID or invite code.",
  });

export const createMatchSchema = z
  .object({
    teamId: z.string().uuid(),
    title: z.string().trim().min(4).max(80),
    sport: z.string().trim().min(2).max(40),
    venueName: z.string().trim().min(2).max(80),
    venueAddress: z.string().trim().max(200).optional().default(""),
    startsAt: z.string().datetime(),
    paymentDueAt: optionalDateTime,
    lockAt: optionalDateTime,
    squadSize: z.coerce.number().int().min(2).max(50),
    pricePerPlayer: z.coerce.number().min(0).max(100000),
    visibility: z.enum(["PRIVATE", "TEAM", "PUBLIC"]).default("TEAM"),
    notes: z.string().trim().max(500).optional().nullable(),
    publishNow: z.boolean().default(true),
  })
  .refine((value) => {
    if (value.paymentDueAt && new Date(value.paymentDueAt) >= new Date(value.startsAt)) {
      return false;
    }

    return true;
  }, "Payment deadline must be before match start.")
  .refine((value) => {
    if (value.lockAt && new Date(value.lockAt) > new Date(value.startsAt)) {
      return false;
    }

    return true;
  }, "Lock time must be before match start.");

export const updateMatchSchema = z.object({
  matchId: z.string().uuid(),
  title: z.string().trim().min(4).max(80).optional(),
  venueName: z.string().trim().min(2).max(80).optional(),
  venueAddress: z.string().trim().max(200).optional(),
  paymentDueAt: optionalDateTime,
  lockAt: optionalDateTime,
  notes: z.string().trim().max(500).optional().nullable(),
  nextState: z.enum(["DRAFT", "RSVP_OPEN", "PAYMENT_PENDING", "LOCKED", "READY"]).optional(),
});

export const matchJoinSchema = z
  .object({
    matchId: z.string().uuid().optional(),
    joinCode: z.string().trim().min(4).max(20).optional(),
    inviteToken: z.string().trim().min(6).max(32).optional(),
  })
  .refine((value) => Boolean(value.matchId || value.joinCode || value.inviteToken), {
    message: "Provide a match ID, join code, or invite token.",
  });

export const createOrderSchema = z.object({
  matchId: z.string().uuid(),
});

export const verifyPaymentSchema = z.object({
  paymentId: z.string().uuid(),
  matchId: z.string().uuid(),
  razorpay_order_id: z.string().min(6),
  razorpay_payment_id: z.string().min(6),
  razorpay_signature: z.string().min(6),
});

export const inviteSendSchema = z.object({
  matchId: z.string().uuid(),
  invitedPhone: phoneSchema,
  invitedName: z.string().trim().max(80).optional().nullable(),
  expiresAt: optionalDateTime,
});

export const inviteAcceptSchema = z.object({
  token: z.string().trim().min(6).max(32),
});

export const inviteExpireSchema = z.object({
  matchId: z.string().uuid().optional(),
});

export const availabilityEntrySchema = z.object({
  slotLabel: z.string().trim().min(2).max(80),
  slotStartsAt: z.string().datetime(),
  slotEndsAt: z.string().datetime(),
  isAvailable: z.boolean(),
});

export const availabilityUpdateSchema = z.object({
  matchId: z.string().uuid(),
  entries: z.array(availabilityEntrySchema).min(1),
});
