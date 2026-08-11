import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Ludo Live terms of service.",
};

const LAST_UPDATED = "August 11, 2026";

export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-white mb-2">Terms of Service</h1>
      <p className="text-slate-500 text-sm mb-8">Last updated: {LAST_UPDATED}</p>

      <div className="flex flex-col gap-6 text-slate-300 leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-white mb-2">Using Ludo Live</h2>
          <p>
            By creating an account or playing Ludo Live, you agree to these terms.
            You must be able to form a binding agreement in your jurisdiction to use
            the service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">Accounts</h2>
          <p>
            You&apos;re responsible for keeping your account credentials secure. You&apos;re
            responsible for activity that happens under your account.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">In-Game Currency and Purchases</h2>
          <p>
            Coins and gems earned or purchased in Ludo Live have no cash value and
            cannot be exchanged, transferred, or redeemed for real money outside the
            game.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">Fair Play</h2>
          <p>
            Cheating, exploiting bugs, or using automated tools to play is not
            allowed and may result in suspension or termination of your account.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">Advertising</h2>
          <p>
            Ludo Live is supported in part by advertising, including through Google
            AdSense. Ads will not interrupt active gameplay.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">Changes to the Service</h2>
          <p>
            We may update, modify, or discontinue features of Ludo Live at any time.
            We&apos;ll do our best to communicate significant changes in advance.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">Contact</h2>
          <p>
            Questions about these terms? Reach out via our{" "}
            <a href="/contact" className="text-emerald-400 hover:underline">
              Contact page
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
