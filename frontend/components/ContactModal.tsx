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

export default function ContactModal({
  isOpen,
  onClose,
  selectedVehicle,
  stageOrOption,
}: ContactModalProps) {
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
    setFormData((prev) => ({
      ...prev,
      stage: stageOrOption || '-',
    }));
  }, [stageOrOption]);



useEffect(() => {
  if (isOpen) {
    setContactMode(null); // Reset mode when modal opens
  }
}, [isOpen]);




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
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Misslyckades att skicka förfrågan');
      }

      setContactMode('thankyou');
      setFormData({
        name: '',
        email: '',
        tel: '',
        message: '',
        branch: '',
        stage: '-',
      });
    } catch (err: any) {
      setError(err.message || 'Något gick fel');
    } finally {
      setSending(false);
    }
  };

  const closeModalFully = () => {
    setContactMode('choose'); // Reset mode back to choose when fully closed
    onClose();
  };

  return (
    <Dialog as="div" className="relative z-50" open={isOpen} onClose={closeModalFully}>
      <div className="fixed inset-0 bg-black bg-opacity-50" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-gray-900 rounded-lg max-w-md w-full p-6 shadow-xl relative">
          <button
            type="button"
            onClick={closeModalFully}
            className="absolute top-4 right-4 text-white text-2xl hover:text-red-400"
          >
            &times;
          </button>

          <Dialog.Title className="text-white text-xl font-bold mb-4 text-center">
            {contactMode === 'thankyou'
              ? 'Tack för din förfrågan!'
              : 'VÄLJ METOD'}
          </Dialog.Title>

          {contactMode === 'choose' && (
            <div className="flex flex-col gap-4">
              <button
                type="button"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                onClick={() => setContactMode('form')}
              >
                📩 SKICKA FÖRFRÅGAN
              </button>
              <button
                type="button"
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                onClick={() => setContactMode('phone')}
              >
                📞 RING OSS
              </button>
            </div>
          )}

          {contactMode === 'form' && (
            <form className="space-y-4 mt-4" onSubmit={handleSubmit}>
              <div className="text-sm text-gray-400 mb-2">
                FÖRFRÅGAN FÖR: <strong>{selectedVehicle.brand} {selectedVehicle.model} {selectedVehicle.year} – {selectedVehicle.engine}</strong>
                {formData.stage && formData.stage !== '-' && (
                  <div className="text-green-400 text-xs mt-1">
                    ➔ Vald Stage/AKT+: <strong>{formData.stage}</strong>
                  </div>
                )}
              </div>

              <input type="text" placeholder="NAMN" required value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-2 rounded bg-gray-800 border border-gray-600"
              />
              <input type="email" placeholder="EMAIL" required value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full p-2 rounded bg-gray-800 border border-gray-600"
              />
              <input type="tel" placeholder="TELEFON" required value={formData.tel}
                onChange={(e) => setFormData({ ...formData, tel: e.target.value })}
                className="w-full p-2 rounded bg-gray-800 border border-gray-600"
              />
              <textarea placeholder="MEDDELANDE" required value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full p-2 rounded bg-gray-800 border border-gray-600" rows={3}
              />
              <select required value={formData.branch}
                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                className="w-full p-2 rounded bg-gray-800 border border-gray-600"
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

              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded">
                {sending ? 'SKICKAR...' : '📩 SKICKA FÖRFRÅGAN'}
              </button>

              {error && <p className="text-red-400 text-center">{error}</p>}
            </form>
          )}

          {contactMode === 'phone' && (
            <div className="text-left text-white mt-4 space-y-2">
              <p><strong>GÖTEBORG (HQ)</strong>: <a href="tel:0313823300" className="text-blue-400 underline">031-382 33 00</a></p>
              <p><strong>JÖNKÖPING</strong>: <a href="tel:0303332300" className="text-blue-400 underline">030-333 23 00</a></p>
              <p><strong>SKÅNE</strong>: <a href="tel:041318166" className="text-blue-400 underline">041-31 81 66</a></p>
              <p><strong>STOCKHOLM</strong>: <a href="tel:0708265573" className="text-blue-400 underline">070-826 55 73</a></p>
              <p><strong>ÖREBRO</strong>: <a href="tel:0708265573" className="text-blue-400 underline">070-826 55 73</a></p>
              <p><strong>STORVIK</strong>: <a href="tel:0708265573" className="text-blue-400 underline">070-826 55 73</a></p>
            </div>
          )}

          {contactMode === 'thankyou' && (
            <div className="text-center text-white space-y-4 mt-6">
              <p className="text-lg">✅ Din förfrågan är skickad!</p>
              <button
                onClick={closeModalFully}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
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
