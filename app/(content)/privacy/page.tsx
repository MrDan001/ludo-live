import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Ludo Live privacy policy.",
};

const LAST_UPDATED = "August 11, 2026";

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-white mb-2">Privacy Policy</h1>
      <p className="text-slate-500 text-sm mb-8">Last updated: {LAST_UPDATED}</p>

      <div className="flex flex-col gap-6 text-slate-300 leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-white mb-2">Information We Collect</h2>
          <p>
            When you create an account, we collect your name, email address, and
            authentication details. When you play, we store your match history,
            in-game currency balances (coins and gems), and leaderboard stats so your
            progress is saved between sessions.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">Cookies and Advertising</h2>
          <p>
            We use cookies to keep you signed in and remember your preferences. We
            also work with third-party advertising partners, including Google
            AdSense, which may use cookies to serve ads based on your visits to this
            and other websites. You can learn more about how Google uses this data
            and manage your ad personalization settings at Google&apos;s Ads Settings
            page.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">How We Use Your Information</h2>
          <p>
            We use collected information to operate the game, save your progress,
            display leaderboards, personalize your experience, and communicate with
            you about your account. We do not sell your personal information to
            third parties.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">Data Sharing</h2>
          <p>
            We share data only with service providers who help us run Ludo Live
            (such as our hosting, authentication, and analytics providers) and as
            required by law.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">Your Choices</h2>
          <p>
            You can update or delete your account information from your profile
            settings, or contact us to request deletion of your data.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">Children&apos;s Privacy</h2>
          <p>
            Ludo Live is not directed at children under 13, and we do not knowingly
            collect personal information from children under 13.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-2">Contact</h2>
          <p>
            Questions about this policy? Reach out via our{" "}
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
