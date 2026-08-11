import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "About Ludo Live — play Ludo online with friends and players around the world.",
};

export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-white mb-6">About Ludo Live</h1>
      <div className="flex flex-col gap-4 text-slate-300 leading-relaxed">
        <p>
          Ludo Live is a free online multiplayer Ludo game. Play the classic board game
          with friends in a private room, or get matched instantly with players from
          around the world.
        </p>
        <p>
          Beyond the classic rules, Ludo Live adds voice and text chat during matches,
          daily rewards, a leaderboard, and a cosmetic shop for dice and board themes —
          all built around the same game millions of people already know and love.
        </p>
        <p>
          Whether you&apos;re playing solo against the computer to learn the ropes or hosting
          a match night with friends, Ludo Live is built to make online Ludo feel as
          close to the real board as possible, without the wait for four people to be in
          the same room.
        </p>
      </div>
    </div>
  );
}
