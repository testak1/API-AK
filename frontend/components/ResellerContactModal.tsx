import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon, PhoneIcon } from "@heroicons/react/24/outline";

interface ResellerContactModalProps {
  open: boolean;
  onClose: () => void;
  contactInfo?: string;
}

export default function ResellerContactModal({
  open,
  onClose,
  contactInfo = "",
}: ResellerContactModalProps) {
  const contactLines = contactInfo
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-40 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-6 pt-5 pb-6 text-left shadow-xl transition-all w-full max-w-md">
                <div className="absolute top-0 right-0 pt-4 pr-4">
                  <button
                    type="button"
                    className="rounded-md text-gray-400 hover:text-gray-600 focus:outline-none"
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                <Dialog.Title
                  as="h3"
                  className="text-lg leading-6 font-medium text-gray-900 mb-4"
                >
                  Contact Information
                </Dialog.Title>

                <div className="space-y-3">
                  {contactLines.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No contact information available.
                    </p>
                  ) : (
                    contactLines.map((line, index) => {
                      const [label, number] = line
                        .split(":")
                        .map((s) => s.trim());
                      const telLink = `tel:${number?.replace(/\s+/g, "")}`;

                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between border border-gray-200 rounded-md p-3"
                        >
                          <div>
                            <div className="text-sm font-medium text-gray-700">
                              {label || "Contact"}
                            </div>
                            <div className="text-sm text-gray-600">
                              {number}
                            </div>
                          </div>
                          <a
                            href={telLink}
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            <PhoneIcon className="h-4 w-4" />
                            Call
                          </a>
                        </div>
                      );
                    })
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
