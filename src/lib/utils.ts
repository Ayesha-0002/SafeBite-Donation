import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function openWhatsApp(phone: string, message: string = "Assalam o Alaikum, connecting from SafeBite.") {
  const cleanPhone = phone.replace(/\D/g, "");
  // Default to Pakistan if it starts with 0
  const formattedPhone = cleanPhone.startsWith("0") ? "92" + cleanPhone.substring(1) : cleanPhone;
  window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, "_blank");
}
