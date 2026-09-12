"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Post = {
  id: number;
  title: string;
  platform: "Facebook" | "Instagram";
  views: number;
  likes: number;
  comments: number;
  shares: number;
};

const initialPosts: Post[] = [
  { id: 1, title: "The story nobody saw coming", platform: "Facebook", views: 18420, likes: 1460, comments: 184, shares: 312 },
  { id: 2, title: "Would you have made the same choice?", platform: "Instagram", views: 27380, likes: 2190, comments: 267, shares: 481 },
  { id: 3, title: "Sometimes the quietest people carry the loudest stories", platform: "Facebook", views: 12150, likes: 980, comments: 103, shares: 201 },
];

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const fmt = (n: number) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);

function statStyle(): React.CSSProperties {
  return {
    background: "rgba(8,30,75,.78)",
    border: "1px solid rgba(78,125,211,.25)",
    borderRadius: 16,
    padding: 16,
  };
}

export default function SocialLabPage() {
  const [followers, setFollowers] = useState(12840);
  const [likes, setLikes] = useState(86420);
  const [comments, setComments] = useState(7340);
  const [views, setViews] = useState(642300);
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState("");

  const engagementRate = useMemo(() => {
    const denominator = Math.max(1, likes + comments);
    return ((denominator / Math.max(1, views)) * 100).toFixed(2);
  }, [likes, comments, views]);

  const simulate = () => {
    setRunning(true);
    setNotice("Simulation running — these are sandbox numbers only.");
    window.setTimeout(() => {
      const newFollowers = 120 + Math.floor(Math.random() * 520);
      const newViews = 6200 + Math.floor(Math.random() * 26000);
      const newLikes = 430 + Math.floor(Math.random() * 2200);
      const newComments = 28 + Math.floor(Math.random() * 180);
      const newShares = 12 + Math.floor(Math.random() * 90);

      setFollowers((v) => v + newFollowers);
      setViews((v) => v + newViews);
      setLikes((v) => v + newLikes);
      setComments((v) => v + newComments);

      setPosts((current) =>
        current.map((post, index) =>
          index === 0
            ? {
                ...post,
                views: post.views + newViews,
                likes: post.likes + newLikes,
                comments: post.comments + newComments,
                shares: post.shares + newShares,
              }
            : post
        )
      );

      setRunning(false);
      setNotice(`Simulation complete: +${newFollowers.toLocaleString()} followers, +${newLikes.toLocaleString()} likes and +${newComments.toLocaleString()} comments.`);
    }, 700);
  };

  const addPost = () => {
    const id = Date.now();
    const seed = Math.floor(Math.random() * 900);
    setPosts((current) => [
      {
        id,
        title: `Story episode #${current.length + 1}`,
        platform: current.length % 2 === 0 ? "Instagram" : "Facebook",
        views: 2400 + seed * 5,
        likes: 180 + Math.floor(seed * 0.35),
        comments: 18 + Math.floor(seed * 0.05),
        shares: 24 + Math.floor(seed * 0.04),
      },
      ...current,
    ]);
    setNotice("New simulated post added.");
  };

  const reset = () => {
    setFollowers(12840);
    setLikes(86420);
    setComments(7340);
    setViews(642300);
    setPosts(initialPosts);
    setNotice("Sandbox reset to the starting scenario.");
  };

  return (
    <main style={{ minHeight: "100dvh", background: "linear-gradient(180deg,#06142d,#020817)", color: "#fff", padding: "18px 14px 50px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
          <Link href="/profile" style={{ color: "#b9c9e5", textDecoration: "none", fontWeight: 800 }}>← Profile</Link>
          <div style={{ fontSize: 10, letterSpacing: 2.2, fontWeight: 950, color: "#61a5ff" }}>LUDO LIVE • SOCIAL LAB</div>
        </div>

        <section style={{ background: "linear-gradient(145deg,#0c2b5f,#07172f)", border: "1px solid rgba(96,154,244,.3)", borderRadius: 22, padding: 20, boxShadow: "0 18px 60px rgba(0,0,0,.28)" }}>
          <div style={{ fontSize: 11, color: "#60a5fa", fontWeight: 950, letterSpacing: 1.8 }}>PRIVATE SANDBOX</div>
          <h1 style={{ margin: "7px 0 8px", fontSize: 30 }}>Social Growth Simulator</h1>
          <p style={{ margin: 0, color: "#b9c9e5", lineHeight: 1.6, fontSize: 13 }}>
            Test social-growth scenarios without connecting to Facebook or Instagram. Every follower, like, comment, view and share shown here is simulated.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginTop: 16 }}>
            <button type="button" onClick={simulate} disabled={running} style={{ border: 0, borderRadius: 12, padding: "12px 16px", background: "linear-gradient(90deg,#1769e8,#2185ff)", color: "#fff", fontWeight: 950, cursor: running ? "default" : "pointer", opacity: running ? .65 : 1 }}>
              {running ? "Simulating…" : "▶ Run simulation"}
            </button>
            <button type="button" onClick={addPost} style={{ border: "1px solid #31517f", borderRadius: 12, padding: "12px 16px", background: "#071a37", color: "#dbeafe", fontWeight: 900, cursor: "pointer" }}>＋ Add simulated post</button>
            <button type="button" onClick={reset} style={{ border: "1px solid rgba(248,113,113,.35)", borderRadius: 12, padding: "12px 16px", background: "rgba(127,29,29,.28)", color: "#fecaca", fontWeight: 900, cursor: "pointer" }}>Reset</button>
          </div>
          {notice && <div aria-live="polite" style={{ marginTop: 12, fontSize: 12, color: "#93c5fd" }}>{notice}</div>}
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10, marginTop: 14 }}>
          <div style={statStyle()}><div style={{ color: "#93c5fd", fontSize: 11 }}>Followers</div><strong style={{ display: "block", fontSize: 28, marginTop: 4 }}>{fmt(followers)}</strong><div style={{ color: "#4ade80", fontSize: 11, marginTop: 5 }}>+ sandbox growth</div></div>
          <div style={statStyle()}><div style={{ color: "#93c5fd", fontSize: 11 }}>Likes</div><strong style={{ display: "block", fontSize: 28, marginTop: 4 }}>{fmt(likes)}</strong><div style={{ color: "#4ade80", fontSize: 11, marginTop: 5 }}>simulated total</div></div>
          <div style={statStyle()}><div style={{ color: "#93c5fd", fontSize: 11 }}>Comments</div><strong style={{ display: "block", fontSize: 28, marginTop: 4 }}>{fmt(comments)}</strong><div style={{ color: "#4ade80", fontSize: 11, marginTop: 5 }}>simulated total</div></div>
          <div style={statStyle()}><div style={{ color: "#93c5fd", fontSize: 11 }}>Views</div><strong style={{ display: "block", fontSize: 28, marginTop: 4 }}>{fmt(views)}</strong><div style={{ color: "#4ade80", fontSize: 11, marginTop: 5 }}>simulated reach</div></div>
        </section>

        <section style={{ marginTop: 14, ...statStyle() }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <div><div style={{ color: "#93c5fd", fontSize: 11 }}>Engagement rate</div><strong style={{ fontSize: 26 }}>{engagementRate}%</strong></div>
            <div style={{ textAlign: "right", color: "#7891b7", fontSize: 11 }}>Sandbox metric<br />not platform data</div>
          </div>
          <div style={{ height: 10, marginTop: 13, borderRadius: 999, background: "#07152f", overflow: "hidden" }}>
            <div style={{ width: `${clamp(Number(engagementRate) * 10, 4, 96)}%`, height: "100%", background: "linear-gradient(90deg,#1769e8,#facc15)" }} />
          </div>
        </section>

        <section style={{ marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Simulated posts</h2>
            <span style={{ color: "#7891b7", fontSize: 11 }}>{posts.length} posts</span>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {posts.map((post) => (
              <article key={post.id} style={{ ...statStyle(), padding: 15 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 10, color: "#61a5ff", fontWeight: 950, letterSpacing: 1 }}>{post.platform.toUpperCase()}</div>
                    <h3 style={{ margin: "5px 0 0", fontSize: 16 }}>{post.title}</h3>
                  </div>
                  <span style={{ fontSize: 10, color: "#facc15", border: "1px solid rgba(250,204,21,.25)", padding: "5px 7px", borderRadius: 999 }}>SIMULATED</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginTop: 13 }}>
                  <Metric label="Views" value={fmt(post.views)} />
                  <Metric label="Likes" value={fmt(post.likes)} />
                  <Metric label="Comments" value={fmt(post.comments)} />
                  <Metric label="Shares" value={fmt(post.shares)} />
                </div>
              </article>
            ))}
          </div>
        </section>

        <div style={{ marginTop: 18, padding: 14, borderRadius: 14, border: "1px dashed rgba(147,197,253,.25)", color: "#7891b7", fontSize: 11, lineHeight: 1.6 }}>
          This Social Lab is intentionally isolated from real social platforms. It is for modelling, testing and experimenting with growth scenarios inside Ludo Live.
        </div>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><div style={{ color: "#7891b7", fontSize: 9 }}>{label}</div><strong style={{ fontSize: 13 }}>{value}</strong></div>;
}
