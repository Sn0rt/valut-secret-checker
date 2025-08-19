import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Debug logging utilities for frontend/shared use
const isDebugMode = process.env.DEBUG === 'true';

export function debugLog(message: string, ...args: unknown[]) {
  if (isDebugMode) {
    console.log(message, ...args);
  }
}

export function debugError(message: string, ...args: unknown[]) {
  if (isDebugMode) {
    console.error(message, ...args);
  } else {
    // In production, still log errors but with less detail
    console.error(message);
  }
}
