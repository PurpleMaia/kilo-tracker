import { z } from "zod";

export const kiloEntrySchema = z.object({
  q1: z.string().min(1, "Question 1 is required"),
  q2: z.string().nullable().optional(),
  q3: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  photo_path: z.string().nullable().optional(),
});

export const deleteKiloSchema = z.object({
  id: z.number().int().positive("Invalid entry ID"),
});

export const updateKiloSchema = kiloEntrySchema.extend({
  id: z.number().int().positive("Invalid entry ID"),
  keep_photo: z.boolean().optional(), // If true, don't update photo
});
