/**
 * Argon2id password hashing helpers for Better-Auth.
 *
 * Better-Auth defaults to scrypt. We override with argon2id to align with the
 * IMPLEMENTATION_PLAN.md §9 ("Password hashing: argon2id") and OWASP's
 * current password-storage recommendations.
 *
 * Parameters below target a ~250–500ms hash on a modern server CPU. Tune as
 * needed based on production hardware (see OWASP Password Storage Cheat Sheet).
 */

import { hash, verify, type Options } from "@node-rs/argon2";

/**
 * OWASP-aligned defaults for argon2id (as of 2024):
 *   - memoryCost 64 MiB, timeCost 3, parallelism 4, output 32 bytes.
 */
const argonOptions: Options = {
  memoryCost: 65536, // 64 MiB
  timeCost: 3,
  parallelism: 4,
  outputLen: 32,
  algorithm: 2, // 2 == Argon2id
};

/**
 * Hash a plaintext password. Signature matches Better-Auth's
 * `emailAndPassword.password.hash` contract.
 */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, argonOptions);
}

/**
 * Verify a plaintext password against a stored argon2id hash. Signature
 * matches Better-Auth's `emailAndPassword.password.verify` contract.
 */
export async function verifyPassword(data: { password: string; hash: string }): Promise<boolean> {
  const { password, hash: stored } = data;
  try {
    return await verify(stored, password, argonOptions);
  } catch {
    // Malformed hash or unrelated argon2 error → treat as failed auth rather
    // than propagating the error (defense in depth against info leaks).
    return false;
  }
}
