import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1),
});

export const hoaSchema = z.object({
  name: z.string().trim().min(2).max(180),
});

export const googleStateSchema = z.object({
  userId: z.string().cuid(),
  hoaId: z.string().cuid(),
  exp: z.number(),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type HoaInput = z.infer<typeof hoaSchema>;
