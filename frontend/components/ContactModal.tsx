import { Dialog } from '@headlessui/react';
import { useState, useEffect } from 'react';

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
}

export default function ContactModal({ isOpen, onClose, selectedVehicle, stageOrOption }: ContactModalProps) {
  const [contactMode, setContactMode] = useState<'form' | 'phone' | 'thankyou' | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    tel: '',
    message: '',
    branch: '',
    stage: '-',
  });

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      stage: stageOrOption || '-',
    }));
  }, [stageOrOption]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Your sending logic
  };

  const handleClose = () => {
    setContactMode(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black bg-opacity-50" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel
          className="bg-gray-900 rounded-lg max-w-md w-full p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()} // <-- THIS prevents clicks from closing!
        >
          {/* Close button */}
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-4 right-4 text-white text-2xl hover:text-red-400"
          >
            &times;
          </button>

          {/* Title */}
          <Dialog.Title className="text-white text-xl font-bold mb-4">
            {contactMode === 'thankyou' ? 'Tack!' : 'VÄLJ ALTERNATIV'}
          </Dialog.Title>

          {/* Choose mode */}
          {!contactMode && (
            <div className="flex flex-col gap-4">
              <button
                type="button"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                onClick={() => setContactMode('form')}
              >
                📩 Skicka Förfrågan
              </button>
              <button
                type="button"
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                onClick={() => setContactMode('phone')}
              >
                📞 Ring Oss
              </button>
            </div>
          )}

          {/* Form */}
          {contactMode === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-4 mt-6">
              {/* ... */}
              <button type="submit" className="bg-blue-500 px-4 py-2 rounded">
                Skicka
              </button>
            </form>
          )}

          {/* Phone numbers */}
          {contactMode === 'phone' && (
            <div className="mt-6 text-white">
              <p>Ring Göteborg: <a href="tel:0313823300" className="text-blue-400">031-382 33 00</a></p>
            </div>
          )}
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
