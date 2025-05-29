import { useEffect } from "react";

const InstagramFeedEmbed = () => {
  useEffect(() => {
    const interval = setInterval(() => {
      const watermark = document.querySelector(
        'a[href*="elfsight.com"][target="_blank"]',
      );
      if (watermark) {
        watermark.remove();
        clearInterval(interval); // stop checking once removed
      }
    }, 100); // check every 100ms in case it's added dynamically

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <script
        src="https://static.elfsight.com/platform/platform.js"
        async
      ></script>
      <div
        className="elfsight-app-58551bec-466c-4a56-bab9-47c7f721ae2a"
        data-elfsight-app-lazy
      ></div>
    </>
  );
};

export default InstagramFeedEmbed;
