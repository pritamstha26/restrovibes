import React from "react";
import { UtensilsCrossed } from "lucide-react";

export default function Logo({ size = 96 }) {
  return (
    <div
      className="app-logo-badge"
      style={{ width: size, height: size }}
      role="img"
      aria-label="RestroVibe logo"
    >
      <UtensilsCrossed size={size * 0.5} strokeWidth={2} />
    </div>
  );
}
