import { useEffect, useState } from "react";

// Current scroll offset and how far down the page the user is (0–1), updated once per frame.
export function useScrollProgress() {
  const [state, setState] = useState({ y: 0, progress: 0 });
  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setState({ y: window.scrollY, progress: max > 0 ? Math.min(1, window.scrollY / max) : 0 });
    };
    const onScroll = () => { frame ||= requestAnimationFrame(read); };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); cancelAnimationFrame(frame); };
  }, []);
  return state;
}
