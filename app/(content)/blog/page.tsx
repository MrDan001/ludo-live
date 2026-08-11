import Link from "next/link";
import type { Metadata } from "next";
import { blogPosts } from "@/lib/content/blog-posts";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Ludo strategy, rules, history, and tips from the Ludo Live blog.",
};

export default function BlogIndexPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-white mb-2">Ludo Blog</h1>
      <p className="text-slate-400 mb-10">
        Strategy guides, rules, history, and tips for getting better at Ludo.
      </p>

      <div className="flex flex-col gap-6">
        {blogPosts
          .slice()
          .sort((a, b) => (a.date < b.date ? 1 : -1))
          .map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="block rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-950/50 p-5 transition-colors"
            >
              <h2 className="text-lg font-bold text-white mb-1">{post.title}</h2>
              <p className="text-slate-400 text-sm mb-3">{post.excerpt}</p>
              <div className="text-xs text-slate-500">
                {new Date(post.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}{" "}
                · {post.readMinutes} min read
              </div>
            </Link>
          ))}
      </div>
    </div>
  );
}
