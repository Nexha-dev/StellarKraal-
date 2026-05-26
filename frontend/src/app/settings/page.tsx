import CurrencySettings from "@/components/CurrencySettings";
import Link from "next/link";

export default function SettingsPage() {
  return (
    <main className="max-w-lg mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="text-brown/60 hover:text-brown text-sm">← Home</Link>
        <h1 className="text-3xl font-bold text-brown">Settings</h1>
      </div>
      <CurrencySettings />
    </main>
  );
}
