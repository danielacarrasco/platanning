"use client";

import { useState } from "react";

const labelCls = "text-xs text-muted block mb-1";
const inputCls =
  "w-28 rounded-lg border border-border bg-background px-2 py-1 text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/40";

export function AdjustableAmount({
  name,
  label,
  defaultValue,
  min,
  max,
  step,
}: {
  name: string;
  label: string;
  defaultValue: number;
  min: number;
  max: number;
  step: number;
}) {
  const [value, setValue] = useState(defaultValue);
  // Only a field the user actually drags or types into should be saved as an override — the
  // others just carry their current (already-live) value along for display. Submitting every
  // field regardless would silently pin the whole fortnight to today's numbers. An untouched
  // input has no `name`, so the browser leaves it out of the form submission entirely.
  const [touched, setTouched] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label className={labelCls}>{label}</label>
        <input
          type="number"
          name={touched ? name : undefined}
          value={value}
          step="any"
          onChange={(e) => {
            setTouched(true);
            setValue(e.target.value === "" ? 0 : Number(e.target.value));
          }}
          className={inputCls}
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={Math.min(Math.max(value, min), max)}
        onChange={(e) => {
          setTouched(true);
          setValue(Number(e.target.value));
        }}
        className="w-full accent-primary"
      />
    </div>
  );
}
