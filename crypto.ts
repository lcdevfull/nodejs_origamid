import { randomBytes } from "node:crypto";
import { promisify } from "node:util";

const randomBytesAsync = promisify(randomBytes);
const buffer = await randomBytesAsync(32);

const hex = buffer.toString("hex");
const base64 = buffer.toString("base64");
const base64url = buffer.toString("base64url");
console.log(base64url);
