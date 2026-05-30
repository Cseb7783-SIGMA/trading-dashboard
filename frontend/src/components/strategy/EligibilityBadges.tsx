"use client";
import { Check, X } from "lucide-react";

export type EligibilityKey = "paper" | "personal" | "propfirm" | "challengeZ";

export type Eligibility = Record<EligibilityKey, boolean>;

const LABELS: Record<EligibilityKey, string> = {
  paper: "Paper",
  personal: "Personal",
  propfirm: "PropFirm",
  challengeZ: "Challenge Z",
};

const ORDER: EligibilityKey[] = ["paper", "personal", "propfirm", "challengeZ"];

type Props = {
  eligibility: Eligibility;
  size?: "sm" | "md";
  showLabels?: boolean;
};

export default function EligibilityBadges({ eligibility, size = "sm", showLabels = true }: Props) {
  const px = size === "sm" ? "px-1.5 py-0.5" : "px-2 py-1";
  const fs = size === "sm" ? "text-[10px]" : "text-xs";
  const icon = size === "sm" ? 10 : 12;

  return (
    <div className="flex gap-1 flex-wrap items-center">
      {ORDER.map((k) => {
        const ok = eligibility[k];
        return (
          <span
            key={k}
            title={`${LABELS[k]} : ${ok ? "eligible" : "non-eligible"}`}
            className={`inline-flex items-center gap-1 rounded-full border ${px} ${fs} font-medium ${
              ok
                ? "bg-green-500/10 text-green-400 border-green-500/30"
                : "bg-red-500/10 text-red-400 border-red-500/30"
            }`}
          >
            {ok ? <Check size={icon} strokeWidth={2.5} /> : <X size={icon} strokeWidth={2.5} />}
            {showLabels && <span>{LABELS[k]}</span>}
          </span>
        );
      })}
    </div>
  );
}
