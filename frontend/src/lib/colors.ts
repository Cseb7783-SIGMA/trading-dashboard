import type { KPIColor } from "./types";

export const C = {
  bg:      "#0D0D0D",
  surface: "#161616",
  border:  "#222222",
  blue:    "#1A5FD4",
  green:   "#22C55E",
  red:     "#EF4444",
  orange:  "#F97316",
  text:    "#F7F7F5",
  muted:   "#6B7280",
} as const;

export function pfColor(pf: number): KPIColor {
  if (pf >= 1.5) return "green";
  if (pf >= 1.2) return "orange";
  return "red";
}

export function ddColor(dd: number): KPIColor {
  const abs = Math.abs(dd);
  if (abs < 5)  return "green";
  if (abs < 10) return "orange";
  return "red";
}

export function sharpeColor(s: number): KPIColor {
  if (s >= 1.5) return "green";
  if (s >= 0.8) return "orange";
  return "red";
}

export function wrColor(wr: number): KPIColor {
  if (wr >= 55) return "green";
  if (wr >= 45) return "orange";
  return "red";
}

export function tradesColor(n: number): KPIColor {
  if (n >= 50) return "green";
  if (n >= 25) return "orange";
  return "red";
}

export function propColor(score: number): KPIColor {
  if (score >= 5) return "green";
  if (score >= 3) return "orange";
  return "red";
}

export function colorClass(c: KPIColor): string {
  return c === "green" ? "text-green-400"
    : c === "orange" ? "text-orange-400"
    : c === "red" ? "text-red-400"
    : "text-gray-400";
}

export function colorHex(c: KPIColor): string {
  return c === "green" ? C.green
    : c === "orange" ? C.orange
    : c === "red" ? C.red
    : C.muted;
}
