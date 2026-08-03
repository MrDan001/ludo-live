"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Volume2, 
  Music, 
  Mic, 
  Vibrate, 
  Globe, 
  ShieldCheck, 
  FileText, 
  HelpCircle, 
  ChevronRight, 
  ArrowLeft 
} from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();

  const [sound, setSound] = useState(true);
  const [music, setMusic] = useState(true);
  const [voiceChat, setVoiceChat] = useState(true);
  const [vibration, setVibration] = useState(true);

  const handleLogout = () => {
    // Add your auth logout logic here (e.g., clear tokens, signOut())
    router.push("/(auth)/login"); // or wherever your login route lives
  };

  return (
    <div className="flex flex-col h-full w-full max-w-sm mx-auto bg-slate-950 text-white rounded-2xl border border-slate-800 shadow-2xl overflow-hidden font-sans">
      {/* Header */}
      <div className="relative flex items-center justify-center p-4 border-b border-slate-800/60 bg-slate-900/50">
        <button 
          onClick={() => router.back()}
          className="absolute left-4 text-slate-400 hover:text-white transition-colors"
          aria-label="Back"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold tracking-wide">Settings</h1>
      </div>

      {/* Settings Options List */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Toggle Items */}
        <div className="space-y-3">
          {/* Sound */}
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-3">
              <Volume2 className="text-slate-400" size={18} />
              <span className="text-sm font-medium">Sound</span>
            </div>
            <button
              onClick={() => setSound(!sound)}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out ${
                sound ? "bg-emerald-500 justify-end" : "bg-slate-700 justify-start"
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white shadow-md transform transition-transform" />
            </button>
          </div>

          {/* Music */}
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-3">
              <Music className="text-slate-400" size={18} />
              <span className="text-sm font-medium">Music</span>
            </div>
            <button
              onClick={() => setMusic(!music)}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out ${
                music ? "bg-emerald-500 justify-end" : "bg-slate-700 justify-start"
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white shadow-md transform transition-transform" />
            </button>
          </div>

          {/* Voice Chat */}
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-3">
              <Mic className="text-slate-400" size={18} />
              <span className="text-sm font-medium">Voice Chat</span>
            </div>
            <button
              onClick={() => setVoiceChat(!voiceChat)}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out ${
                voiceChat ? "bg-emerald-500 justify-end" : "bg-slate-700 justify-start"
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white shadow-md transform transition-transform" />
            </button>
          </div>

          {/* Vibration */}
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-3">
              <Vibrate className="text-slate-400" size={18} />
              <span className="text-sm font-medium">Vibration</span>
            </div>
            <button
              onClick={() => setVibration(!vibration)}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out ${
                vibration ? "bg-emerald-500 justify-end" : "bg-slate-700 justify-start"
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white shadow-md transform transition-transform" />
            </button>
          </div>
        </div>

        <div className="h-[1px] bg-slate-800/80 my-2" />

        {/* Navigation Items */}
        <div className="space-y-3">
          {/* Language */}
          <button className="w-full flex items-center justify-between py-1 text-left hover:opacity-80 transition-opacity">
            <div className="flex items-center gap-3">
              <Globe className="text-slate-400" size={18} />
              <span className="text-sm font-medium">Language</span>
            </div>
            <div className="flex items-center gap-1 text-slate-400">
              <span className="text-xs">English</span>
              <ChevronRight size={16} />
            </div>
          </button>

          {/* Privacy Policy */}
          <button className="w-full flex items-center justify-between py-1 text-left hover:opacity-80 transition-opacity">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-slate-400" size={18} />
              <span className="text-sm font-medium">Privacy Policy</span>
            </div>
          </button>

          {/* Terms of Service */}
          <button className="w-full flex items-center justify-between py-1 text-left hover:opacity-80 transition-opacity">
            <div className="flex items-center gap-3">
              <FileText className="text-slate-400" size={18} />
              <span className="text-sm font-medium">Terms of Service</span>
            </div>
          </button>

          {/* Help & Support */}
          <button className="w-full flex items-center justify-between py-1 text-left hover:opacity-80 transition-opacity">
            <div className="flex items-center gap-3">
              <HelpCircle className="text-slate-400" size={18} />
              <span className="text-sm font-medium">Help & Support</span>
            </div>
          </button>
        </div>
      </div>

      {/* Logout Button */}
      <div className="p-4 mt-auto">
        <button
          onClick={handleLogout}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-semibold text-sm shadow-lg shadow-red-900/30 transition-all active:scale-[0.98]"
        >
          Logout
        </button>
      </div>
    </div>
  );
}