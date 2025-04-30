// pages/embed.tsx
import { useEffect } from "react";
import TuningViewer from "./index";

export default function Embed() {
  useEffect(() => {
    const sendHeight = () => {
      // Get the full height including any open modal
      const height = document.documentElement.scrollHeight;
      window.parent.postMessage({ height }, "*");
    };

    sendHeight(); // Initial

    const observer = new MutationObserver(sendHeight);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    window.addEventListener("resize", sendHeight);
    window.addEventListener("modalStateChange", sendHeight); // Add this if you can trigger custom events

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", sendHeight);
      window.removeEventListener("modalStateChange", sendHeight);
    };
  }, []);

  return (
    <div style={{ padding: 0, margin: 0 }}>
      <TuningViewer />
    </div>
  );
}
