"use client";

interface CaptureToastProps {
  text: string | null;
}

/** Small transient banner across the top of the board announcing a
 *  capture ("Player1's token was sent home!"). Parent owns the timing -
 *  this just renders whatever text it's given, or nothing. */
export default function CaptureToast({ text }: CaptureToastProps) {
  if (!text) return null;
  return (
    <div className="absolute top-1.5 left-1/2 -translate-x-1/2 z-50 px-3 py-1 rounded-full bg-red-600/95 border border-red-300 text-white text-xs font-bold shadow-lg whitespace-nowrap animate-bounce pointer-events-none">
      {text}
    </div>
  );
}
