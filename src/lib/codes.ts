import { randomInt } from "node:crypto";

// No 0/O/1/I/l: a code gets read aloud and copied by hand.
const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** A short, unambiguous access code for a student login. */
export function generateAccessCode(length = 10) {
  let code = "";
  for (let index = 0; index < length; index += 1) {
    if (index === 5) code += "-";
    code += alphabet[randomInt(alphabet.length)];
  }
  return code;
}
