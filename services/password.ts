import { compare } from "bcryptjs";

/**
 * A bcrypt hash (cost 12, like every stored password) of a random value
 * nobody knows. Sign-in compares against it when the account is unknown or
 * has no password, so the answer takes as long as a wrong password and the
 * timing does not reveal which addresses have accounts.
 */
const DUMMY_PASSWORD_HASH = "$2b$12$qcb1uD0Oy/kvrjAFTuGk2eC6YvZmO3cIFLhSNbU8MtoSvrEHpetKa";

/** True when `password` matches `storedHash`; always false (after the same work) when there is no hash. */
export async function verifyPassword(password: string, storedHash: string | null | undefined): Promise<boolean> {
  if (!storedHash) {
    await compare(password, DUMMY_PASSWORD_HASH);
    return false;
  }
  return compare(password, storedHash);
}
