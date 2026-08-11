import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { blogPosts, getBlogPost } from "@/lib/content/blog-posts";

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  return (
    <article className="max-w-2xl mx-auto px-4 py-12">
      <Link href="/blog" className="text-emerald-400 text-sm hover:underline">
        ← Back to Blog
      </Link>

      <h1 className="text-3xl font-extrabold text-white mt-4 mb-2">{post.title}</h1>
      <div className="text-xs text-slate-500 mb-8">
        {new Date(post.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}{" "}
        · {post.readMinutes} min read
      </div>

      <div className="flex flex-col gap-4 text-slate-300 leading-relaxed">
        {post.content.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>

      <div className="mt-12 rounded-xl border border-slate-800 bg-slate-950/50 p-5 flex items-center justify-between">
        <p className="text-sm text-slate-400">Ready to put it into practice?</p>
        <Link
          href="/"
          className="rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-4 py-1.5 text-sm transition-colors"
        >
          Play Ludo Live
        </Link>
      </div>
    </article>
  );
}
