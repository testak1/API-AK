import { useEffect } from "react";
import TuningViewer from "./index";

export default function Embed() {
  useEffect(() => {
    const sendHeight = () => {
      setTimeout(() => {
        const height = document.body.scrollHeight;
        window.parent.postMessage({ height }, "*");
      }, 50); // slight delay ensures layout settles
    };

    sendHeight(); // initial

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
