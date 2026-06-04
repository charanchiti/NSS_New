import { useState, useEffect } from 'react';

export function fmtTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

export function fmtDuration(startTime) {
  if (!startTime) return '—';
  const ms = new Date() - new Date(startTime);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

export function useClock(startTime) {
  const [clock, setClock] = useState(() => fmtTime(new Date()));
  const [duration, setDuration] = useState(() => fmtDuration(startTime));

  useEffect(() => {
    const timer = setInterval(() => {
      setClock(fmtTime(new Date()));
      if (startTime) {
        setDuration(fmtDuration(startTime));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  return { clock, duration };
}
