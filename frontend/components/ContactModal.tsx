import { Dialog } from '@headlessui/react';
import { Fragment, useState } from 'react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVehicle: {
    brand: string;
    model: string;
    year: string;
    engine: string;
  };
}

export default function ContactModal({ isOpen, onClose, selectedVehicle }: ContactModalProps) {
  const [contactMode, setContactMode] = useState<'form' | 'phone' | null>(null);

  return (
    <Dialog as="div" className="fixed z-50 inset-0 overflow-y-auto" onClose={onClose} open={isOpen}>
      <div className="flex items-center justify-center min-h-screen p-4 text-center bg-black bg-opacity-50">
        <Dialog.Panel className="bg-gray-900 rounded-lg max-w-md w-full p-6 shadow-xl">
          <Dialog.Title className="text-white text-xl font-bold mb-4">
            Contact Options
          </Dialog.Title>

          {!contactMode && (
            <div className="flex flex-col gap-4">
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                onClick={() => setContactMode('form')}
              >
                📩 Send Enquiry
              </button>
              <button
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                onClick={() => setContactMode('phone')}
              >
                📞 Call Us
              </button>
            </div>
          )}

{contactMode === 'form' && (
  <form className="space-y-4 text-left mt-4 text-white">
    <div className="text-sm text-gray-400 mb-2">
      Request for: <strong>{selectedVehicle.brand} {selectedVehicle.model} {selectedVehicle.year} – {selectedVehicle.engine}</strong>
    </div>

    <input type="text" placeholder="Name" className="w-full p-2 rounded bg-gray-800 border border-gray-600" />
    <input type="email" placeholder="Email" className="w-full p-2 rounded bg-gray-800 border border-gray-600" />
    <input type="tel" placeholder="Phone Number" className="w-full p-2 rounded bg-gray-800 border border-gray-600" />
    <textarea placeholder="Message" className="w-full p-2 rounded bg-gray-800 border border-gray-600" rows={3} />

    <select className="w-full p-2 rounded bg-gray-800 border border-gray-600">
      <option value="">Select Dealer</option>
      <option value="goteborg">Göteborg</option>
      <option value="stockholm">Stockholm</option>
    </select>

    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded">
      Send Request
    </button>
  </form>
)}

          {contactMode === 'phone' && (
            <div className="text-left text-white mt-4 space-y-2">
              <p><strong>Göteborg:</strong> <a href="tel:0313823300" className="text-blue-400 underline">031-382 33 00</a></p>
              <p><strong>Stockholm:</strong> <a href="tel:0303332300" className="text-blue-400 underline">030-333 23 00</a></p>
            </div>
          )}

          <button
            onClick={() => {
              onClose();
              setContactMode(null);
            }}
            className="mt-6 text-sm text-gray-400 hover:text-white"
          >
            Cancel
          </button>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}