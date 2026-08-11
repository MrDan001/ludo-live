import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the Ludo Live team.",
};

// TODO: replace with your real support email before publishing.
const CONTACT_EMAIL = "support@ludogo.live";

export default function ContactPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-white mb-6">Contact Us</h1>
      <div className="flex flex-col gap-4 text-slate-300 leading-relaxed">
        <p>
          Questions, bug reports, or feedback about Ludo Live? We&apos;d like to hear from
          you.
        </p>
        <p>
          Email us at{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-emerald-400 hover:underline">
            {CONTACT_EMAIL}
          </a>{" "}
          and we&apos;ll get back to you as soon as we can.
        </p>
      </div>
    </div>
  );
}
