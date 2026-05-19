import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function openWhatsApp(phone: string) {
  // Ensure the phone number starts with a '+' or just clean it.
  // The wa.me URL works best with international format, with or without '+'.
  const cleanPhone = phone.replace(/\D/g, "");
  window.open(`https://wa.me/${cleanPhone}`, "_blank");
}
