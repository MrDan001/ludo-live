"use client";
import { useRouter } from "next/navigation";

export default function FreePlayButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.push("/lobby?mode=free")}
      style={{ width: "100%", minHeight: 48, border: 0, borderRadius: 12, background: "#16a34a", color: "#fff", fontWeight: 900, fontSize: 15, cursor: "pointer", touchAction: "manipulation" }}
    >
      🎮 FREE PLAY — NO COINS
    </button>
  );
}
