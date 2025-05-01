import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useEffect, useState } from "react";

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVehicle: {
    brand: string;
    model: string;
    year: string;
    engine: string;
  };
  stageOrOption?: string;
  link?: string;
  scrollPosition?: number;
}

export default function ContactModal({
  isOpen,
  onClose,
  selectedVehicle,
  stageOrOption,
  link,
  scrollPosition = 200,
}: ContactModalProps) {
  const [contactMode, setContactMode] = useState<
    "form" | "phone" | "thankyou" | null
  >(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    tel: "",
    message: "",
    branch: "",
    stage: "-",
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) setContactMode(null);
  }, [isOpen]);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      stage: stageOrOption || "-",
    }));
  }, [stageOrOption]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        window.parent.postMessage({ height: document.body.scrollHeight }, "*");
      }, 300);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError("");

    try {
      const response = await fetch("/api/send-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          vehicle: selectedVehicle,
          link,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Misslyckades att skicka förfrågan");
      }

      setFormData({
        name: "",
        email: "",
        tel: "",
        message: "",
        branch: "",
        stage: "-",
      });
      setContactMode("thankyou");
    } catch (err: any) {
      setError(err.message || "Något gick fel");
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setContactMode(null);
    onClose();
  };

  // ✅ Mobile-aware modal positioning
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;
  const modalTop = isMobile ? "50%" : `${scrollPosition}px`;
  const modalTransform = isMobile
    ? "translate(-50%, -50%)"
    : "translateX(-50%)";

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="fixed z-50 inset-0" onClose={() => {}} static>
        <div className="fixed inset-0 bg-black bg-opacity-50" />

        {/* ✅ MODAL POSITIONING FIXED HERE */}
        <div
          className="fixed left-1/2 transform -translate-x-1/2 z-50 px-4 w-full max-w-md sm:px-6"
          style={{
            top:
              typeof window !== "undefined" && window.innerWidth <= 768
                ? "1100px" // mobile
                : "600px", // desktop
          }}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-90"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-90"
          >
            <Dialog.Panel className="bg-gray-900 rounded-lg text-white max-w-md w-full p-6 shadow-xl relative">
              <button
                type="button"
                onClick={handleClose}
                className="absolute top-4 right-4 text-white text-3xl hover:text-red-400"
              >
                &times;
              </button>

              <Dialog.Title className="text-green-400 text-xl font-bold mb-4 text-center">
                {contactMode === "thankyou" ? (
                  <>
                    TACK FÖR DIN FÖRFRÅGAN!
                    <br />
                    VI BESVARAR SÅ FORT VI KAN
                  </>
                ) : (
                  "VÄLJ METOD"
                )}
              </Dialog.Title>

              {!contactMode && (
                <div className="flex flex-col gap-4">
                  <button
                    type="button"
                    className="bg-blue-600 hover:bg-blue-700 active:scale-95 transition transform px-4 py-2 rounded-lg shadow-md font-semibold"
                    onClick={() => setContactMode("form")}
                  >
                    📩 SKICKA FÖRFRÅGAN
                  </button>
                  <button
                    type="button"
                    className="bg-green-600 hover:bg-green-700 active:scale-95 transition transform px-4 py-2 rounded-lg shadow-md font-semibold"
                    onClick={() => setContactMode("phone")}
                  >
                    📞 RING OSS
                  </button>
                  {/* STÄNG button */}
                  <button
                    type="button"
                    onClick={handleClose}
                    className="w-full bg-gray-700 hover:bg-gray-600 text-white hover:text-red-400 py-2 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <span>❌</span>
                    STÄNG
                  </button>
                </div>
              )}

              {contactMode === "form" && (
                <form
                  className="space-y-4 text-white mt-4"
                  onSubmit={handleSubmit}
                >
                  <div className="text-sm text-gray-400 mb-2">
                    FÖRFRÅGAN FÖR:{" "}
                    <strong>
                      {selectedVehicle.brand} {selectedVehicle.model}{" "}
                      {selectedVehicle.year} – {selectedVehicle.engine}
                    </strong>
                    {formData.stage && formData.stage !== "-" && (
                      <div className="mt-1 text-green-400 text-xs">
                        <strong>VAL ➔ {formData.stage.toUpperCase()}</strong>
                      </div>
                    )}
                  </div>

                  <input
                    type="text"
                    placeholder="🏷️ NAMN"
                    required
                    className="w-full p-2 rounded bg-gray-800 border border-gray-600"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                  <input
                    type="email"
                    placeholder="📧 EMAIL"
                    required
                    className="w-full p-2 rounded bg-gray-800 border border-gray-600"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                  <input
                    type="tel"
                    placeholder="☎️ TELNR"
                    required
                    className="w-full p-2 rounded bg-gray-800 border border-gray-600"
                    value={formData.tel}
                    onChange={(e) =>
                      setFormData({ ...formData, tel: e.target.value })
                    }
                  />
                  <textarea
                    placeholder="💬 MEDDELANDE"
                    required
                    className="w-full p-2 rounded bg-gray-800 border border-gray-600"
                    rows={3}
                    value={formData.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                  ></textarea>
                  <select
                    required
                    className="w-full p-2 rounded bg-gray-800 border border-gray-600"
                    value={formData.branch}
                    onChange={(e) =>
                      setFormData({ ...formData, branch: e.target.value })
                    }
                  >
                    <option value="">📍 VÄLJ ANLÄGGNING</option>
                    <option value="goteborg">GÖTEBORG (HQ)</option>
                    <option value="jonkoping">JÖNKÖPING</option>
                    <option value="malmo">MALMÖ</option>
                    <option value="stockholm">STOCKHOLM</option>
                    <option value="orebro">ÖREBRO</option>
                    <option value="storvik">STORVIK</option>
                  </select>

                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full bg-blue-600 hover:bg-blue-700 active:scale-95 transition transform px-4 py-2 rounded-lg font-semibold"
                  >
                    {sending ? "Skickar..." : "📩 SKICKA FÖRFRÅGAN"}
                  </button>
                  {/* STÄNG button */}
                  <button
                    type="button"
                    onClick={handleClose}
                    className="w-full bg-gray-700 hover:bg-gray-600 text-white hover:text-red-400 py-2 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <span>❌</span>
                    STÄNG
                  </button>

                  {error && <p className="text-red-400 text-center">{error}</p>}
                </form>
              )}

              {contactMode === "phone" && (
                <div className="text-white mt-4 space-y-4 text-left">
                  {[
                    { city: "GÖTEBORG (HQ)", number: "0313823300" },
                    { city: "JÖNKÖPING", number: "0362907887" },
                    { city: "SKÅNE", number: "041318166" },
                    { city: "STOCKHOLM", number: "0708265573" },
                    { city: "ÖREBRO", number: "0708265573" },
                    { city: "STORVIK", number: "0708265573" },
                  ].map(({ city, number }) => (
                    <a
                      key={city}
                      href={`tel:${number}`}
                      target="_top"
                      rel="noopener"
                      className="flex items-center gap-3 bg-gray-800 hover:bg-gray-700 p-3 rounded-lg transition-colors"
                    >
                      <span className="text-green-400 text-2xl">📞</span>
                      <div className="flex flex-col">
                        <span className="font-semibold">{city}</span>
                        <span className="text-sm text-gray-400">{number}</span>
                      </div>
                    </a>
                  ))}

                  {/* STÄNG Button */}
                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="w-full bg-gray-700 hover:bg-gray-600 text-white hover:text-red-400 py-2 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <span>❌</span>
                      STÄNG
                    </button>
                  </div>
                </div>
              )}
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
