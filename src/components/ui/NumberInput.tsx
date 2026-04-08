"use client";

import * as React from "react";

interface NumberInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: number;
  min?: number;
  max?: number;
  onChangeValue: (val: number) => void;
  label?: string;
}

export function NumberInput({
  value,
  min = 0,
  max = 100,
  onChangeValue,
  label,
  className = "",
  ...props
}: NumberInputProps) {
  const handleIncrement = () => {
    if (value < max) onChangeValue(value + 1);
  };

  const handleDecrement = () => {
    if (value > min) onChangeValue(value - 1);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <label className="text-sm font-medium text-foreground">{label}</label>}
      <div className="relative group/num">
        <input
          {...props}
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChangeValue(Number(e.target.value))}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ecu-purple pr-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        
        {/* Custom Scrollbar-style vertical arrows */}
        <div className="absolute right-1 top-1 bottom-1 w-6 flex flex-col gap-0.5 py-0.5">
          <button
            type="button"
            onClick={handleIncrement}
            className="flex-1 flex items-center justify-center rounded-t-lg bg-border/40 hover:bg-border/60 transition-colors text-muted-foreground hover:text-foreground"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleDecrement}
            className="flex-1 flex items-center justify-center rounded-b-lg bg-border/40 hover:bg-border/60 transition-colors text-muted-foreground hover:text-foreground"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
