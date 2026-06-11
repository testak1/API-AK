import { useRouter } from "next/router";
import { useEffect } from "react";
import TuningViewer from "./index";

export default function Embed() {
  const router = useRouter();
  const { resellerId } = router.query;

  useEffect(() => {
    const sendHeight = () => {
      const root = document.getElementById("reseller-embed-content");
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
    debouncedSendHeight();

    const root =
      document.getElementById("reseller-embed-content") || document.body;

    const mutationObserver = new MutationObserver(debouncedSendHeight);
    mutationObserver.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    window.addEventListener("resize", debouncedSendHeight);

    const resizeObserver = new ResizeObserver(debouncedSendHeight);
    resizeObserver.observe(root);

    return () => {
      mutationObserver.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("resize", debouncedSendHeight);
    };
  }, []);

  return (
    <div id="reseller-embed-content">
      <TuningViewer />
    </div>
  );
}
