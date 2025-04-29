// pages/embed.tsx
import { useEffect } from "react";
import TuningViewer from "./index"; // adjust if needed

export default function Embed() {
  useEffect(() => {
    const sendHeight = () => {
      const height = document.body.scrollHeight;
      window.parent.postMessage({ height }, "*");
    };

    sendHeight(); // Initial send

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

  return (
    <div style={{ padding: 0, margin: 0 }}>
      <TuningViewer />
    </div>
  );
}
