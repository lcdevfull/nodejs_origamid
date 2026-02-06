import {
  type BinaryLike,
  type ScryptOptions,
  createHmac,
  randomBytes,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const randomBytesAsync = promisify(randomBytes);
const scryptAsync: (
  password: BinaryLike,
  salt: BinaryLike,
  keylen: number,
  options?: ScryptOptions,
) => Promise<Buffer> = promisify(scrypt);

export class Password {
  SCRYPT_OPTIONS: ScryptOptions = {
    N: 2 ** 14,
    r: 8,
    p: 1,
  };
  DK_LEN = 32;
  SALT_LEN = 16;
  NORM = "NFC";
  PEPPER: string;

  constructor(pepper: string) {
    this.PEPPER = pepper;
  }

  /** Cria a hash da senha */
  async hash(password: string) {
    const password_normalized = password.normalize("NFC");
    const password_hmac = createHmac("sha256", this.PEPPER)
      .update(password_normalized)
      .digest();
    const salt = await randomBytesAsync(this.SALT_LEN);
    const dk = await scryptAsync(
      password_hmac,
      salt,
      this.DK_LEN,
      this.SCRYPT_OPTIONS,
    );
    return (
      `script$v=1$norm=${this.NORM}$N=${this.SCRYPT_OPTIONS.N},r=${this.SCRYPT_OPTIONS.r},p=${this.SCRYPT_OPTIONS.p}` +
      `$${salt.toString("hex")}$${dk.toString("hex")}`
    );
  }

  /** Pega a senha criptografada do usuário e retorna um buffer da senha e do salt */
  parse(password_hash: string) {
    const [id, v, norm, options, storedSaltHex, storedDkHEx] =
      password_hash.split("$");
    const storedeDk = Buffer.from(storedDkHEx, "hex");
    const storedeSalt = Buffer.from(storedSaltHex, "hex");
    const storedNorm = norm.replace("norm=", "");
    const storedOptions = options.split(",").reduce(
      (acc, kv) => {
        const [k, v] = kv.split("=");
        acc[k] = Number(v);
        return acc;
      },
      {} as Record<string, number>,
    );
    return {
      storedOptions,
      storedNorm,
      storedeDk,
      storedeSalt,
    };
  }

  /** Verifica se a senha do usuário, juntamente com o salt, correspondem ao hash no banco de dados */
  async verify(password: string, password_hash: string) {
    try {
      const { storedOptions, storedNorm, storedeDk, storedeSalt } =
        this.parse(password_hash);
      const password_normalized = password.normalize(storedNorm);
      const password_hmac = createHmac("sha256", this.PEPPER)
        .update(password_normalized)
        .digest();
      const dk = await scryptAsync(
        password_hmac,
        storedeSalt,
        this.DK_LEN,
        storedOptions,
      );

      if (dk.length !== storedeDk.length) return false;

      return timingSafeEqual(dk, storedeDk);
    } catch (error) {
      console.error(error);
      return false;
    }
  }
}
