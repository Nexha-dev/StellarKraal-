import { z } from "zod";
import { StrKey } from "@stellar/stellar-sdk";

/**
 * Custom Zod validator for Stellar public keys.
 * Validates that the key:
 * - Is a 56-character string
 * - Starts with 'G'
 * - Is valid base32-encoded
 * - Passes Stellar SDK's StrKey validation
 */
export const stellarPublicKeySchema = z
  .string()
  .length(56, "Stellar public key must be exactly 56 characters")
  .startsWith("G", "Stellar public key must start with 'G'")
  .refine(
    (key) => {
      try {
        return StrKey.isValidEd25519PublicKey(key);
      } catch {
        return false;
      }
    },
    { message: "Invalid Stellar public key format" }
  );

/**
 * Type-safe Stellar public key type
 */
export type StellarPublicKey = z.infer<typeof stellarPublicKeySchema>;

/**
 * Validates a Stellar public key and returns the result
 */
export function validateStellarPublicKey(key: string): {
  success: boolean;
  data?: StellarPublicKey;
  error?: string;
} {
  const result = stellarPublicKeySchema.safeParse(key);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    error: result.error.issues[0]?.message || "Invalid Stellar public key format",
  };
}