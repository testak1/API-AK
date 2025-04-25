// components/ContactModal.tsx
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
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    tel: '',
    message: '',
    branch: '',
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSending(true);
    setError('');

    try {
      const response = await fetch('/api/send-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          vehicle: selectedVehicle,
          stage: '-', // or you can dynamically pass selected stage later
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Misslyckades att skicka förfrågan');
      }

      // ✅ Reset form and close
      setFormData({
        name: '',
        email: '',
        tel: '',
        message: '',
        branch: '',
      });
      setContactMode(null);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Något gick fel');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog as="div" className="fixed z-50 inset-0 overflow-y-auto" onClose={onClose} open={isOpen}>
      <div className="flex items-center justify-center min-h-screen p-4 text-center bg-black bg-opacity-50">
        <Dialog.Panel className="bg-gray-900 rounded-lg max-w-md w-full p-6 shadow-xl">
          <Dialog.Title className="text-white text-xl font-bold mb-4">
            VÄLJ METOD NEDANFÖR
          </Dialog.Title>

          {!contactMode && (
            <div className="flex flex-col gap-4">
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                onClick={() => setContactMode('form')}
              >
                📩 SKICKA FÖRFRÅGAN
              </button>
              <button
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                onClick={() => setContactMode('phone')}
              >
                📞 RING OSS
              </button>
            </div>
          )}

          {contactMode === 'form' && (
            <form className="space-y-4 text-left mt-4 text-white" onSubmit={handleSubmit}>
              <div className="text-sm text-gray-400 mb-2">
                FÖRFRÅGAN FÖR: <strong>{selectedVehicle.brand} {selectedVehicle.model} {selectedVehicle.year} – {selectedVehicle.engine}</strong>
              </div>

              <input
                type="text"
                placeholder="NAMN"
                className="w-full p-2 rounded bg-gray-800 border border-gray-600"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <input
                type="email"
                placeholder="EMAIL"
                className="w-full p-2 rounded bg-gray-800 border border-gray-600"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              <input
                type="tel"
                placeholder="TELNR"
                className="w-full p-2 rounded bg-gray-800 border border-gray-600"
                value={formData.tel}
                onChange={(e) => setFormData({ ...formData, tel: e.target.value })}
                required
              />
              <textarea
                placeholder="MEDDELANDE"
                className="w-full p-2 rounded bg-gray-800 border border-gray-600"
                rows={3}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                required
              ></textarea>

              <select
                className="w-full p-2 rounded bg-gray-800 border border-gray-600"
                value={formData.branch}
                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                required
              >
                <option value="">VÄLJ ANLÄGGNING</option>
                <option value="TEST-AK">TEST-AK</option>
                <option value="goteborg">GÖTEBORG (HQ)</option>
                <option value="jonkoping">JÖNKÖPING</option>
                <option value="malmo">MALMÖ</option>
                <option value="stockholm">STOCKHOLM</option>
                <option value="orebro">ÖREBRO</option>
                <option value="storvik">STORVIK</option>
              </select>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
                disabled={sending}
              >
                {sending ? 'Skickar...' : '📩 SKICKA FÖRFRÅGAN'}
              </button>

              {error && <p className="text-red-400 text-center">{error}</p>}
            </form>
          )}

          {contactMode === 'phone' && (
            <div className="text-left text-white mt-4 space-y-2">
              <p><strong>GÖTEBORG (HQ) - </strong> <a href="tel:0313823300" className="text-blue-400 underline">031-382 33 00</a></p>
              <p><strong>JÖNKÖPING - </strong> <a href="tel:0303332300" className="text-blue-400 underline">030-333 23 00</a></p>
              <p><strong>SKÅNE - </strong> <a href="tel:041318166" className="text-blue-400 underline">041-31 81 66</a></p>
              <p><strong>STOCKHOLM - </strong> <a href="tel:0708265573" className="text-blue-400 underline">070-826 55 73</a></p>
              <p><strong>ÖREBRO - </strong> <a href="tel:0708265573" className="text-blue-400 underline">070-826 55 73</a></p>
              <p><strong>STORVIK - </strong> <a href="tel:0708265573" className="text-blue-400 underline">070-826 55 73</a></p>
            </div>
          )}

          <button
            onClick={() => {
              onClose();
              setContactMode(null);
            }}
            className="mt-6 text-sm text-gray-400 hover:text-white"
          >
            STÄNG
          </button>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
