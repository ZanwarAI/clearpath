"use client";

import { useEffect, useState } from "react";

interface CircularProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showValue?: boolean;
  label?: string;
}

export function CircularProgress({
  value,
  size = 120,
  strokeWidth = 8,
  className = "",
  showValue = true,
  label,
}: CircularProgressProps) {
  const [animatedValue, setAnimatedValue] = useState(0);
  
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (animatedValue / 100) * circumference;
  
  const getColor = (val: number) => {
    if (val >= 75) return { stroke: "#10b981", bg: "#d1fae5", text: "text-emerald-600" };
    if (val >= 50) return { stroke: "#f59e0b", bg: "#fef3c7", text: "text-amber-600" };
    return { stroke: "#ef4444", bg: "#fee2e2", text: "text-red-600" };
  };
  
  const colors = getColor(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedValue(value);
    }, 100);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="progress-ring">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.bg}
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="progress-ring-circle"
        />
      </svg>
      {showValue && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-bold tabular-nums ${colors.text}`}>
            {Math.round(animatedValue)}%
          </span>
          {label && (
            <span className="text-xs text-slate-500 mt-0.5">{label}</span>
          )}
        </div>
      )}
    </div>
  );
}
