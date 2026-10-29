"use client";
import { useEffect, useState } from "react";
export function useResendCooldown(initial = false): { seconds: number; start: () => void } {
  const [until, setUntil] = useState(() => initial ? Date.now() + 60_000 : 0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!until) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [until]);
  return { seconds: Math.max(0, Math.ceil((until - now) / 1000)), start: () => {
    const time = Date.now(); setNow(time); setUntil(time + 60_000);
  } };
}
