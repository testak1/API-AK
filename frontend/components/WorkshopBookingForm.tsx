import { FormEvent, useState } from "react";
import { CalendarDays, CheckCircle2, Loader2, Send } from "lucide-react";

interface WorkshopBookingFormProps {
  stationSlug: string;
  stationName: string;
  serviceTitle: string;
}

const initialForm = {
  name: "",
  email: "",
  phone: "",
  registrationNumber: "",
  vehicle: "",
  preferredDate: "",
  timePreference: "Spelar ingen roll",
  message: "",
};

export default function WorkshopBookingForm({
  stationSlug,
  stationName,
  serviceTitle,
}: WorkshopBookingFormProps) {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">(
    "idle",
  );
  const [error, setError] = useState("");

  const update = (field: keyof typeof initialForm, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("sending");
    setError("");

    try {
      const response = await fetch("/api/send-workshop-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          stationSlug,
          stationName,
          serviceTitle,
          pageUrl: window.location.href,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Kunde inte skicka förfrågan.");

      setStatus("success");
      setForm(initialForm);
    } catch (submitError) {
      setStatus("error");
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Något gick fel. Försök igen eller ring oss.",
      );
    }
  };

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-7 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
        <h3 className="mt-4 text-2xl font-black">Tack för din förfrågan!</h3>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/70">
          Vi har skickat din bokningsförfrågan till AK-TUNING {stationName} och återkommer så snart vi kan.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
      <div className="sm:col-span-2 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-white/80">
        <span className="font-bold text-red-300">Förvald tjänst:</span> {serviceTitle} · AK-TUNING {stationName}
      </div>

      <label className="grid gap-2 text-sm font-bold">
        Namn
        <input required value={form.name} onChange={(event) => update("name", event.target.value)} className="rounded-xl border border-white/15 bg-black/25 px-4 py-3 font-normal outline-none transition placeholder:text-white/30 focus:border-red-400" placeholder="För- och efternamn" />
      </label>
      <label className="grid gap-2 text-sm font-bold">
        Telefon
        <input required type="tel" value={form.phone} onChange={(event) => update("phone", event.target.value)} className="rounded-xl border border-white/15 bg-black/25 px-4 py-3 font-normal outline-none transition placeholder:text-white/30 focus:border-red-400" placeholder="070 123 45 67" />
      </label>
      <label className="grid gap-2 text-sm font-bold">
        E-post
        <input required type="email" value={form.email} onChange={(event) => update("email", event.target.value)} className="rounded-xl border border-white/15 bg-black/25 px-4 py-3 font-normal outline-none transition placeholder:text-white/30 focus:border-red-400" placeholder="namn@exempel.se" />
      </label>
      <label className="grid gap-2 text-sm font-bold">
        Registreringsnummer
        <input value={form.registrationNumber} onChange={(event) => update("registrationNumber", event.target.value.toUpperCase())} className="rounded-xl border border-white/15 bg-black/25 px-4 py-3 font-normal uppercase outline-none transition placeholder:text-white/30 focus:border-red-400" placeholder="ABC123" />
      </label>
      <label className="grid gap-2 text-sm font-bold">
        Bilmodell
        <input value={form.vehicle} onChange={(event) => update("vehicle", event.target.value)} className="rounded-xl border border-white/15 bg-black/25 px-4 py-3 font-normal outline-none transition placeholder:text-white/30 focus:border-red-400" placeholder="Ex. Audi S3 2020" />
      </label>
      <label className="grid gap-2 text-sm font-bold">
        Önskat datum
        <input required type="date" min={new Date().toISOString().slice(0, 10)} value={form.preferredDate} onChange={(event) => update("preferredDate", event.target.value)} className="rounded-xl border border-white/15 bg-black/25 px-4 py-3 font-normal outline-none transition focus:border-red-400" />
      </label>
      <label className="grid gap-2 text-sm font-bold sm:col-span-2">
        När passar det bäst?
        <select value={form.timePreference} onChange={(event) => update("timePreference", event.target.value)} className="rounded-xl border border-white/15 bg-black/25 px-4 py-3 font-normal outline-none transition focus:border-red-400">
          <option>Spelar ingen roll</option>
          <option>Förmiddag</option>
          <option>Eftermiddag</option>
        </select>
      </label>
      <label className="grid gap-2 text-sm font-bold sm:col-span-2">
        Berätta kort om jobbet
        <textarea value={form.message} onChange={(event) => update("message", event.target.value)} rows={4} className="resize-y rounded-xl border border-white/15 bg-black/25 px-4 py-3 font-normal outline-none transition placeholder:text-white/30 focus:border-red-400" placeholder="Beskriv gärna vad du vill ha hjälp med." />
      </label>

      {status === "error" && <p className="text-sm text-red-300 sm:col-span-2">{error}</p>}
      <button disabled={status === "sending"} type="submit" className="inline-flex items-center justify-center gap-3 rounded-full bg-red-600 px-7 py-4 text-sm font-extrabold uppercase tracking-wide transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-70 sm:col-span-2">
        {status === "sending" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {status === "sending" ? "Skickar förfrågan" : "Skicka bokningsförfrågan"}
      </button>
      <p className="flex items-center justify-center gap-2 text-center text-xs leading-relaxed text-white/45 sm:col-span-2"><CalendarDays className="h-3.5 w-3.5" /> Detta är en förfrågan — verkstaden bekräftar tid med dig.</p>
    </form>
  );
}
