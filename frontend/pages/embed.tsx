import { useEffect } from "react";
import TuningViewer from "./index";

export default function Embed() {
  useEffect(() => {
    const sendHeight = () => {
      const root = document.getElementById("embed-content");
      const height = root
        ? Math.ceil(root.getBoundingClientRect().height)
        : document.documentElement.scrollHeight;
      window.parent.postMessage({ height }, "*");
    };

    const debounce = (fn: () => void, delay: number) => {
      let timeout: ReturnType<typeof setTimeout>;
      return () => {
        clearTimeout(timeout);
        timeout = setTimeout(fn, delay);
      };
    };

    const debouncedSendHeight = debounce(sendHeight, 100);

    // Initial post
    debouncedSendHeight();

    // Watch for DOM changes
    const root = document.getElementById("embed-content") || document.body;

    const mutationObserver = new MutationObserver(debouncedSendHeight);
    mutationObserver.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    // Watch for resize events
    window.addEventListener("resize", debouncedSendHeight);

    // Optional: Track element size changes (e.g. images loading, modal expanding)
    const resizeObserver = new ResizeObserver(debouncedSendHeight);
    resizeObserver.observe(root);

    return () => {
      mutationObserver.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("resize", debouncedSendHeight);
    };
  }, []);

  return (
    <div id="embed-content">
      <TuningViewer />
    </div>
  );
}
