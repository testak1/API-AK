import { useEffect } from "react";

const InstagramFeedEmbed = () => {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://static.elfsight.com/platform/platform.js";
    script.async = true;
    script.setAttribute("data-use-service-core", "true");
    document.body.appendChild(script);
  }, []);

  return (
    <div className="my-20">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-4">
          Följ oss på <span className="text-orange-500">Instagram</span>
        </h2>
        <p className="text-gray-400">Se våra senaste projekt direkt i flödet</p>
      </div>

      <div
        className="elfsight-app-58551bec-466c-4a56-bab9-47c7f721ae2a"
        data-elfsight-app-lazy
      ></div>
    </div>
  );
};

export default InstagramFeedEmbed;
