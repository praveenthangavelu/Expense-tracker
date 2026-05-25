import { useEffect, useState } from "react";

const easeOutExpo = (progress) =>
  progress === 1 ? 1 : 1 - 2 ** (-10 * progress);

export const useAnimatedNumber = (target, duration = 1500) => {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const from = value;
    const to = Number(target) || 0;
    let frameId;

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = easeOutExpo(progress);
      setValue(from + (to - from) * eased);

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
    // value is intentionally omitted so each new target animates from the visible value at effect start.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return value;
};
