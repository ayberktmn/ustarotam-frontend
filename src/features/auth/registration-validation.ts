export function passwordIsValid(password: string): boolean {
  return password.length >= 12 && password.length <= 128 &&
    /[a-z]/.test(password) && /[A-Z]/.test(password) &&
    /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
}

export function nameIsValid(name: string): boolean {
  return name.trim().length >= 2 && name.trim().length <= 100;
}

export function phoneIsValid(phone: string): boolean {
  return !phone.trim() || (phone.trim().length >= 7 && phone.trim().length <= 32);
}
import { z } from "zod";

export function emailIsValid(email: string): boolean {
  return z.email().max(320).safeParse(email.trim()).success;
}

