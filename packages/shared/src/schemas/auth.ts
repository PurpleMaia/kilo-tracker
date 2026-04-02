import { z } from "zod";

export const loginSchema = z.object({
  identifier: z.string()
    .min(1, { message: "Email or Username is required." })
    .refine((value) => {
      // Check if it's a valid email
      const emailResult = z.email().safeParse(value);
      if (emailResult.success) return true;

      // If not email, check if it's a valid username (3+ chars, alphanumeric + underscores)
      const usernameRegex = /^[a-zA-Z0-9_]{3,}$/;
      return usernameRegex.test(value);
    }, {
      message: "Please enter a valid email address or username (3+ characters, letters, numbers, and underscores only)."
    }),
  password: z.string()
    .min(1, { message: "Password is required." }),
});

/** Lenient version of loginSchema for development (skips identifier format check) */
export const loginSchemaLenient = z.object({
  identifier: z.string().min(1, { message: "Email or Username is required." }),
  password: z.string().min(1, { message: "Password is required." }),
});

export const registerSchema = z.object({
  email: z.email({ message: "Please enter a valid email address" }),
  username: z.string()
    .min(3, { message: "Username must be at least 3 characters long" })
    .regex(/^[a-zA-Z0-9_]+$/, { message: "Username can only contain letters, numbers, and underscores" }),
  password: z.string()
    .min(8, { message: "Password must be at least 8 characters long" }),
  organizationId: z.string().optional() // Organization is optional
});
