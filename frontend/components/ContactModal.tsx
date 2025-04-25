import React, { useState } from 'react';

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
  const [step, setStep] = useState<'choose' | 'form'>('choose');
  const [isSendingForm, setIsSendingForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    tel: '',
    message: '',
    branch: '',
  });
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  if (!isOpen) return null;

  const validateFields = () => {
    const newErrors: Record<string, boolean> = {};

    if (!formData.name) newErrors.name = true;
    if (!formData.email) newErrors.email = true;
    if (!formData.tel) newErrors.tel = true;
    if (!formData.message) newErrors.message = true;
    if (!formData.branch) newErrors.branch = true;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateFields()) return;

    setIsSendingForm(true);
    setSubmitSuccess(false);
    setSubmitError('');

    try {
      const response = await fetch('/api/send-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          vehicle: selectedVehicle,
        }),
      });

      if (!response.ok) throw new Error('Server error');

      setSubmitSuccess(true);
      setFormData({
        name: '',
        email: '',
        tel: '',
        message: '',
        branch: '',
      });
    } catch (error: any) {
      setSubmitError(error.message || 'Något gick fel');
    } finally {
      setIsSendingForm(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-gray-900 p-6 rounded-lg shadow-xl max-w-lg w-full relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-white hover:text-red-400 text-2xl">&times;</button>

        {step === 'choose' ? (
          <>
            <h2 className="text-2xl font-bold mb-6 text-center text-white">VÄLJ ALTERNATIV</h2>
            <div className="flex flex-col space-y-4">
              <button
                onClick={() => setStep('form')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition"
              >
                📩 SKICKA FÖRFRÅGAN
              </button>
              <a
                href="tel:+46701234567"
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg text-center transition"
              >
                📞 RING OSS
              </a>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-6 text-center text-white">SKICKA FÖRFRÅGAN</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="NAMN"
                className={`w-full p-2 rounded bg-gray-800 border ${errors.name ? 'border-red-500' : 'border-gray-600'}`}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              {errors.name && <p className="text-red-500 text-sm">Fyll i namn</p>}

              <input
                type="email"
                placeholder="E-POST"
                className={`w-full p-2 rounded bg-gray-800 border ${errors.email ? 'border-red-500' : 'border-gray-600'}`}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              {errors.email && <p className="text-red-500 text-sm">Fyll i e-post</p>}

              <input
                type="tel"
                placeholder="TELEFON"
                className={`w-full p-2 rounded bg-gray-800 border ${errors.tel ? 'border-red-500' : 'border-gray-600'}`}
                value={formData.tel}
                onChange={(e) => setFormData({ ...formData, tel: e.target.value })}
              />
              {errors.tel && <p className="text-red-500 text-sm">Fyll i telefonnummer</p>}

              <textarea
                placeholder="MEDDELANDE"
                className={`w-full p-2 rounded bg-gray-800 border ${errors.message ? 'border-red-500' : 'border-gray-600'}`}
                rows={4}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              ></textarea>
              {errors.message && <p className="text-red-500 text-sm">Fyll i meddelande</p>}

              <select
                className={`w-full p-2 rounded bg-gray-800 border ${errors.branch ? 'border-red-500' : 'border-gray-600'}`}
                value={formData.branch}
                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
              >
                <option value="">VÄLJ FILIAL</option>
                <option value="TEST-AK">TEST-AK</option>
                <option value="Göteborg">GÖTEBORG (HQ)</option>
                <option value="Jönköping">JÖNKÖPING</option>
                <option value="Malmö">MALMÖ</option>
                <option value="Stockholm">STOCKHOLM</option>
                <option value="Stockholm">ÖREBRO</option>
                <option value="Stockholm">STORVIK</option>
              </select>
              {errors.branch && <p className="text-red-500 text-sm">Välj en anläggning</p>}

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition"
                disabled={isSendingForm}
              >
                {isSendingForm ? 'Skickar...' : '📩 SKICKA'}
              </button>

              {submitSuccess && (
                <p className="text-green-400 text-center mt-4">✅ Förfrågan skickad!</p>
              )}
              {submitError && (
                <p className="text-red-400 text-center mt-4">❌ {submitError}</p>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  );
}
