import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useState, useEffect } from "react";
import { t } from "@/lib/translations";

interface ResellerContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicleInfo: {
    brand: string;
    model: string;
    year: string;
    engine: string;
  };
  stageOrOption?: string;
  lang: string;
  link?: string;
  scrollPosition?: number;
}

interface ContactNumber {
  location: string;
  number: string;
  lang: string;
}

export default function ResellerContactModal({
  isOpen,
  onClose,
  vehicleInfo,
  stageOrOption,
  lang,
  link,
}: ResellerContactModalProps) {
  const [mode, setMode] = useState<"options" | "form" | "phone" | "thankyou">(
    "options",
  );
  const [contactNumbers, setContactNumbers] = useState<ContactNumber[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  // Fetch reseller's contact info when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchContactInfo();
    }
  }, [isOpen]);

  const fetchContactInfo = async () => {
    try {
      const resellerId = window.location.pathname.split("/")[2];
      const response = await fetch(
        `/api/reseller-contact-info?resellerId=${resellerId}`,
      );
      const data = await response.json();

      if (data.contactInfo) {
        const parsedContacts = data.contactInfo
          .split("\n")
          .filter((line) => line.trim())
          .map((line) => {
            const [location, number] = line
              .split(":")
              .map((part) => part.trim());
            return { location, number };
          })
          .filter((contact) => contact.location && contact.number);

        setContactNumbers(parsedContacts);
      }
    } catch (error) {
      console.error("Failed to fetch contact info", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const resellerId = window.location.pathname.split("/")[2];
      await fetch("/api/reseller-contact-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          resellerId,
          vehicleInfo,
          stageOrOption,
        }),
      });

      setMode("thankyou");
      setFormData({ name: "", email: "", phone: "", message: "" });
    } catch (error) {
      console.error("Failed to submit contact request", error);
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setMode("options");
    onClose();
  };

  const handleClose = () => {
    setMode(null);
    onClose();
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="fixed inset-0 z-50 overflow-y-auto"
        onClose={resetModal}
      >
        <div className="min-h-screen px-4 text-center">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-50" />
          </Transition.Child>

          <span
            className="inline-block h-screen align-middle"
            aria-hidden="true"
          >
            &#8203;
          </span>

          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-gray-800 shadow-xl rounded-2xl">
              {mode === "thankyou" ? (
                <div className="text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                    <svg
                      className="h-6 w-6 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium text-green-500"
                  >
                    {t(lang, "requestSent")}
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-300">
                      {t(lang, "requestNote")}
                    </p>
                  </div>
                  <div className="mt-4">
                    <button
                      type="button"
                      className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500"
                      onClick={resetModal}
                    >
                      {t(lang, "close")}
                    </button>
                  </div>
                </div>
              ) : mode === "options" ? (
                <>
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-white text-center"
                  >
                    {t(lang, "contactModalTitle")}
                  </Dialog.Title>
                  <div className="mt-4 space-y-3">
                    <p className="text-sm text-gray-300 text-center">
                      {t(lang, "selectContactOption")}
                    </p>

                    <div className="space-y-2">
                      <button
                        onClick={() => setMode("form")}
                        className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <svg
                          className="w-5 h-5 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                        {t(lang, "sendForm")}
                      </button>

                      <button
                        onClick={() => setMode("phone")}
                        className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                      >
                        <svg
                          className="w-5 h-5 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                          />
                        </svg>
                        {t(lang, "call")}
                      </button>
                      <button
                        type="button"
                        onClick={handleClose}
                        className="w-full bg-gray-700 hover:bg-gray-600 text-white hover:text-red-400 py-2 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                      >
                        <span>❌</span>
                        CLOSE
                      </button>
                    </div>
                  </div>
                </>
              ) : mode === "form" ? (
                <form onSubmit={handleSubmit}>
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-white"
                  >
                    {t(lang, "contactFormTitle")}
                  </Dialog.Title>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label
                        htmlFor="name"
                        className="block text-sm font-medium text-gray-300"
                      >
                        {t(lang, "nameLabel")}
                      </label>
                      <input
                        type="text"
                        id="name"
                        required
                        className="mt-1 block w-full rounded-md border-gray-600 shadow-sm bg-gray-700 text-white"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-medium text-gray-300"
                      >
                        {t(lang, "emailLabel")}
                      </label>
                      <input
                        type="email"
                        id="email"
                        required
                        className="mt-1 block w-full rounded-md border-gray-600 shadow-sm bg-gray-700 text-white"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="phone"
                        className="block text-sm font-medium text-gray-300"
                      >
                        {t(lang, "phoneLabel")}
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        required
                        className="mt-1 block w-full rounded-md border-gray-600 shadow-sm bg-gray-700 text-white"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="message"
                        className="block text-sm font-medium text-gray-300"
                      >
                        {t(lang, "messageLabel")}
                      </label>
                      <textarea
                        id="message"
                        rows={3}
                        required
                        className="mt-1 block w-full rounded-md border-gray-600 shadow-sm bg-gray-700 text-white"
                        value={formData.message}
                        onChange={(e) =>
                          setFormData({ ...formData, message: e.target.value })
                        }
                      />
                    </div>

                    <div className="pt-2 space-x-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setMode("options")}
                        className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-transparent rounded-md hover:bg-gray-600"
                      >
                        {t(lang, "back")}
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-70"
                      >
                        {loading ? t(lang, "sending") : t(lang, "sendMessage")}
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                mode === "phone" && (
                  <div>
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-medium leading-6 text-white"
                    >
                      {t(lang, "phoneTitle")}
                    </Dialog.Title>
                    <div className="mt-4 space-y-3">
                      {contactNumbers.length > 0 ? (
                        contactNumbers.map((contact, index) => (
                          <a
                            key={index}
                            href={`tel:${contact.number}`}
                            className="flex items-center p-3 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
                          >
                            <svg
                              className="w-5 h-5 text-green-400 mr-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                              />
                            </svg>
                            <div>
                              <p className="font-medium">{contact.location}</p>
                              <p className="text-sm text-gray-400">
                                {contact.number}
                              </p>
                            </div>
                          </a>
                        ))
                      ) : (
                        <p className="text-gray-400 text-sm">
                          {t(lang, "noPhoneNumbers")}
                        </p>
                      )}

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => setMode("options")}
                          className="w-full inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-transparent rounded-md hover:bg-gray-600"
                        >
                          {t(lang, "back")}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
