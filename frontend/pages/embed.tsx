// pages/embed.tsx
import { useEffect } from "react";
import TuningViewer from "./index";

export default function Embed() {
  useEffect(() => {
    const sendHeight = () => {
      // Kontrollera om modal är öppen
      const modalOpen = document.querySelector(".contact-modal-open");
      if (!modalOpen) {
        const height = document.body.scrollHeight;
        window.parent.postMessage({ height }, "*");
      }
    };

    sendHeight(); // Initial

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
