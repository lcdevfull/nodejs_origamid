import { RouteError } from "./route-error.ts";

/**
 * Limpa espaços vazios antes e depois da string. Não aceita string vazia
 * @param x unknown
 * @returns string || undefined
 */
function string(x: unknown) {
  if (typeof x !== "string") return undefined;
  const s = x.trim();
  if (s.length === 0) return undefined;
  return s;
}
/**
 * Valida se a entrada é do tipo number. Se for uma string numberlike, retorna como number
 * @param x unknown
 * @returns number || undefined
 */
function number(x: unknown) {
  if (typeof x === "number") {
    return Number.isFinite(x) ? x : undefined;
  }
  if (typeof x === "string" && x.trim().length !== 0) {
    const n = Number(x);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

/**
 * Aceita valores como true, 'true', 1, '1' e 'on'
 * @param x unknown
 * @returns boolean || undefined
 */
function boolean(x: unknown) {
  if (x === true || x === "true" || x === 1 || x === "1" || x === "on") {
    return true;
  }
  if (x === false || x === "false" || x === 0 || x === "0" || x === "off") {
    return false;
  }
  return undefined;
}

/**
 * Verifica se é um objeto literal
 * @param x unknown
 * @returns object || undefined
 */
function object(x: unknown): Record<string, unknown> | undefined {
  return typeof x === "object" && x !== null && !Array.isArray(x)
    ? (x as Record<string, unknown>)
    : undefined;
}

const email_re = /^[^@]+@[^@]+\.[^@]+$/;
/**
 * Verifica se é um email válido e torna todos os carateres do email em minúsculo
 * @param x unknown
 * @returns string || undefined
 */
function email(x: unknown) {
  const s = string(x)?.toLowerCase();
  if (!s) return undefined;
  return email_re.test(s) ? s : undefined;
}
const password_re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
/**
 * Mínimo de 10 e máximo de 256 caracteres, ao menos 1 caixa alta, uma baixa e 1 dígito
 * @param x unknown
 * @returns string || undefined
 */
function password(x: unknown) {
  if (typeof x !== "string") return undefined;
  if (password.length < 10 || x.length > 256) return undefined;
  return password_re.test(x) ? x : undefined;
}

type Parse<Value> = (x: unknown) => Value | undefined;

function required<Value>(fn: Parse<Value>, error: string) {
  return (x: unknown) => {
    const value = fn(x);
    if (value === undefined) throw new RouteError(422, error);

    return value;
  };
}

export const v = {
  string: required(string, "string esperada"),
  number: required(number, "Número inválido"),
  boolean: required(boolean, "Boolean inválido"),
  object: required(object, "Objeto inválido"),
  email: required(email, "Email inválido"),
  password: required(password, "Senha inválida"),
  o: {
    string,
    number,
    boolean,
    object,
    email,
    password,
  },
};
