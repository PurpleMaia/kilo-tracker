import { z } from "zod";

function emptyToUndefined(val: unknown) {
  return typeof val === "string" && val.trim() === "" ? undefined : val;
}

export const profileUpdateSchema = z.object({
  first_name: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
  last_name: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
  dob: z.preprocess(emptyToUndefined, z.string().optional()),
  mauna: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
  aina: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
  wai: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
  kula: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
  role: z.preprocess(emptyToUndefined, z.string().trim().min(1).optional()),
  consent_privacy_ack: z.boolean().optional(),
  share_kilo_entries: z.boolean().optional(),
  encrypt_kilo_entries: z.boolean().optional(),
});
