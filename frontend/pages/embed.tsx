// pages/embed.tsx
import { useEffect, useState } from "react";
import TuningViewer from "./index"; // Adjust the path if needed

export default function Embed() {
  const [modalOpen, setModalOpen] = useState(false);

  // Resize & notify parent on DOM changes
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

  // Scroll iframe into view when modal is opened
  useEffect(() => {
    if (modalOpen) {
      const height = document.body.scrollHeight;
      window.parent.postMessage({ height }, "*");
      window.parent.postMessage("scrollTop", "*");
    }
  }, [modalOpen]);

  return (
    <div style={{ padding: 0, margin: 0 }}>
      <TuningViewer onModalToggle={setModalOpen} />
    </div>
  );
}
