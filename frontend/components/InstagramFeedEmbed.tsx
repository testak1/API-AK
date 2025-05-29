import { useEffect } from "react";

const InstagramFeedEmbed = ({ widgetId }: { widgetId: string }) => {
  useEffect(() => {
    const scriptId = "elfsight-platform";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://static.elfsight.com/platform/platform.js";
      script.async = true;
      document.body.appendChild(script);
    }

    const interval = setInterval(() => {
      const watermark = document.querySelector(
        'a[href*="elfsight.com"][target="_blank"]',
      );
      if (watermark) {
        watermark.remove();
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  if (!widgetId) return null;

  return (
    <div className="my-20">
      <div className={widgetId} data-elfsight-app-lazy></div>
    </div>
  );
};

export default InstagramFeedEmbed;
