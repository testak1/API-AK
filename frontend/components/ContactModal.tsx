// components/ContactModal.tsx
import { Dialog } from '@headlessui/react';
import { useEffect, useState } from 'react';

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
  const [contactMode, setContactMode] = useState<'choose' | 'form' | 'phone' | 'thankyou'>('choose');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    tel: '',
    message: '',
    branch: '',
    stage: '-', 
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (stageOrOption) {
      setFormData((prev) => ({ ...prev, stage: stageOrOption }));
    }
  }, [stageOrOption]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError('');

    try {
      const res = await fetch('/api/send-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, vehicle: selectedVehicle }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Misslyckades att skicka förfrågan');
      }

      setFormData({
        name: '',
        email: '',
        tel: '',
        message: '',
        branch: '',
        stage: stageOrOption || '-',
      });
      setContactMode('thankyou');
    } catch (err: any) {
      setError(err.message || 'Något gick fel');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      email: '',
      tel: '',
      message: '',
      branch: '',
      stage: '-',
    });
    setContactMode('choose');
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-gray-900 rounded-lg max-w-md w-full p-6 relative">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-white hover:text-red-400 text-2xl"
          >
            &times;
          </button>

          {/* Dialog content */}
          {contactMode === 'choose' && (
            <>
              <Dialog.Title className="text-white text-xl font-bold mb-6 text-center">
                VÄLJ ALTERNATIV
              </Dialog.Title>
              <div className="flex flex-col gap-4">
                <button
                  type="button"
                  onClick={() => setContactMode('form')}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg"
                >
                  📩 SKICKA FÖRFRÅGAN
                </button>
                <button
                  type="button"
                  onClick={() => setContactMode('phone')}
                  className="bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg"
                >
                  📞 RING OSS
                </button>
              </div>
            </>
          )}

          {contactMode === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-4 text-white mt-4">
              <div className="text-sm text-gray-400">
                FÖRFRÅGAN FÖR: <strong>{selectedVehicle.brand} {selectedVehicle.model} {selectedVehicle.year} – {selectedVehicle.engine}</strong>
                {formData.stage && formData.stage !== '-' && (
                  <div className="mt-1 text-green-400 text-xs">
                    ➔ Vald Stage/AKT+: <strong>{formData.stage}</strong>
                  </div>
                )}
              </div>

              <input
                type="text"
                placeholder="NAMN"
                required
                className="w-full p-2 rounded bg-gray-800 border border-gray-600"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <input
                type="email"
                placeholder="EMAIL"
                required
                className="w-full p-2 rounded bg-gray-800 border border-gray-600"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <input
                type="tel"
                placeholder="TELNR"
                required
                className="w-full p-2 rounded bg-gray-800 border border-gray-600"
                value={formData.tel}
                onChange={(e) => setFormData({ ...formData, tel: e.target.value })}
              />
              <textarea
                placeholder="MEDDELANDE"
                required
                className="w-full p-2 rounded bg-gray-800 border border-gray-600"
                rows={3}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              />
              <select
                required
                className="w-full p-2 rounded bg-gray-800 border border-gray-600"
                value={formData.branch}
                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
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
                className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-lg"
                disabled={sending}
              >
                {sending ? 'SKICKAR...' : '📩 SKICKA FÖRFRÅGAN'}
              </button>

              {error && <p className="text-red-400 text-center">{error}</p>}
            </form>
          )}

          {contactMode === 'phone' && (
            <div className="text-white mt-6 text-left space-y-2">
              <p><strong>GÖTEBORG (HQ)</strong> — <a href="tel:0313823300" className="text-blue-400 underline">031-382 33 00</a></p>
              <p><strong>JÖNKÖPING</strong> — <a href="tel:0303332300" className="text-blue-400 underline">030-333 23 00</a></p>
              <p><strong>SKÅNE</strong> — <a href="tel:041318166" className="text-blue-400 underline">041-31 81 66</a></p>
              <p><strong>STOCKHOLM</strong> — <a href="tel:0708265573" className="text-blue-400 underline">070-826 55 73</a></p>
              <p><strong>ÖREBRO</strong> — <a href="tel:0708265573" className="text-blue-400 underline">070-826 55 73</a></p>
              <p><strong>STORVIK</strong> — <a href="tel:0708265573" className="text-blue-400 underline">070-826 55 73</a></p>
            </div>
          )}

          {contactMode === 'thankyou' && (
            <div className="text-center text-white mt-6 space-y-4">
              <p className="text-lg">✅ DIN FÖRFRÅGAN ÄR SKICKAD!</p>
              <button
                type="button"
                onClick={handleClose}
                className="bg-green-600 hover:bg-green-700 text-white py-2 px-6 rounded-lg"
              >
                STÄNG
              </button>
            </div>
          )}
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
