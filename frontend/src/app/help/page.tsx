import Link from "next/link";

const guides = [
  {
    title: "Register Livestock as Collateral",
    description: "Step-by-step guide to registering your animals on StellarKraal.",
    links: [
      { label: "English", href: "https://github.com/teslims2/StellarKraal-/blob/main/docs/guides/en/register-collateral.md" },
      { label: "Kiswahili", href: "https://github.com/teslims2/StellarKraal-/blob/main/docs/guides/sw/register-collateral.md" },
    ],
  },
];

export default function HelpPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-2">
        <Link href="/" className="text-brown/60 hover:text-brown text-sm">← Home</Link>
      </div>
      <h1 className="text-3xl font-bold text-brown mb-2">Help &amp; Guides</h1>
      <p className="text-brown/60 mb-8 text-sm">Plain-language guides to help you get started.</p>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-brown mb-4 border-b border-brown/10 pb-2">User Guides</h2>
        <ul className="space-y-4">
          {guides.map((guide) => (
            <li key={guide.title} className="bg-white rounded-xl p-4 shadow-sm">
              <p className="font-medium text-brown mb-1">{guide.title}</p>
              <p className="text-brown/60 text-sm mb-3">{guide.description}</p>
              <div className="flex gap-3">
                {guide.links.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm underline text-brown hover:text-brown/70"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-brown mb-4 border-b border-brown/10 pb-2">Other Resources</h2>
        <ul className="space-y-2 text-sm">
          <li>
            <Link href="/help/faq" className="underline text-brown hover:text-brown/70">
              Frequently Asked Questions
            </Link>
          </li>
          <li>
            <a
              href="https://github.com/teslims2/StellarKraal-/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-brown hover:text-brown/70"
            >
              Open a support issue on GitHub
            </a>
          </li>
        </ul>
      </section>
    </main>
  );
}
