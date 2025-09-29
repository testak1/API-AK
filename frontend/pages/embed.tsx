// embed.tsx
import { useEffect, useState, useCallback } from "react"; // Lägg till useState och useCallback
import TuningViewer from "./index";

export default function Embed() {
  const [lastSentHeight, setLastSentHeight] = useState<number | null>(null);

  const sendHeight = useCallback(() => {
    // Använd documentElement för bättre tillförlitlighet
    const height = document.documentElement.scrollHeight;

    // Skicka bara meddelandet om höjden faktiskt har ändrats
    if (height !== lastSentHeight) {
      setLastSentHeight(height);
      window.parent.postMessage({ height }, "*");
    }
  }, [lastSentHeight]);

  useEffect(() => {
    const debounce = (fn: () => void, delay: number) => {
      let timeout: ReturnType<typeof setTimeout>;
      return () => {
        clearTimeout(timeout);
        timeout = setTimeout(fn, delay);
      };
    };

    // Använd requestAnimationFrame för att mäta höjden vid ett stabilare tillfälle
    const stableSendHeight = () => {
      window.requestAnimationFrame(() => {
        sendHeight();
      });
    };

    const debouncedSendHeight = debounce(stableSendHeight, 150); // Öka debounce lite

    debouncedSendHeight();

    const mutationObserver = new MutationObserver(debouncedSendHeight);
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    const resizeObserver = new ResizeObserver(debouncedSendHeight);
    resizeObserver.observe(document.documentElement);

    window.addEventListener("resize", debouncedSendHeight);

    return () => {
      mutationObserver.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("resize", debouncedSendHeight);
    };
  }, [sendHeight]);

  return <TuningViewer />;
}
