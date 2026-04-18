"use client";

import { useTransition } from "react";
import { setAccentAction } from "@/app/actions/preferences";

const SWATCHES = [260, 210, 160, 20, 340, 45];

export default function AccentPicker({ current }: { current: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <div style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
      {SWATCHES.map((h) => {
        const active = Number(current) === h;
        return (
          <button
            key={h}
            type="button"
            disabled={pending}
            aria-label={`accent ${h}`}
            onClick={() => startTransition(() => setAccentAction(h))}
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              border: active ? "2px solid var(--text-1)" : "1px solid var(--border)",
              background: `oklch(0.62 0.18 ${h})`,
              cursor: "pointer",
              padding: 0,
            }}
          />
        );
      })}
    </div>
  );
}
