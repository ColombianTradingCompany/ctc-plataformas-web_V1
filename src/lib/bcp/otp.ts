import { createHash, randomInt } from "crypto";

export function generateOtpCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashOtpCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}
