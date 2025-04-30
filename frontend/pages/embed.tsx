// pages/embed.tsx
import { useEffect, useRef } from "react";
import TuningViewer from "./index"; // Adjust path if moved

export default function Embed() {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sendHeight = () => {
      const height = document.body.scrollHeight;
      window.parent.postMessage({ height }, "*");
    };

    sendHeight();

    const observer = new MutationObserver(sendHeight);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    window.addEventListener("resize", sendHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", sendHeight);
    };
  }, []);

  // Listen for scroll request from index.tsx (on contact modal open)
  useEffect(() => {
    const scrollToIframe = () => {
      if (wrapperRef.current) {
        const rect = wrapperRef.current.getBoundingClientRect();
        const offset = window.scrollY + rect.top;
        window.parent.postMessage({ action: "scrollTo", offset }, "*");
      }
    };

    window.addEventListener("scrollToIframe", scrollToIframe);

    return () => {
      window.removeEventListener("scrollToIframe", scrollToIframe);
    };
  }, []);

  return (
    <div ref={wrapperRef} style={{ padding: 0, margin: 0 }}>
      <TuningViewer />
    </div>
  );
}
