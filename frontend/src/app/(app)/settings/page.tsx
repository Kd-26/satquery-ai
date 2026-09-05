"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { User, Bell, Shield, Database, Moon, ChevronRight, Check } from "lucide-react";

const ease = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

const SECTIONS = ["Account", "Preferences", "Notifications", "Storage & Privacy"];

export default function SettingsPage() {
  const [section, setSection] = useState("Account");
  const [mode, setMode] = useState("simple");
  const [notifs, setNotifs] = useState({ email: true, inApp: true, failureAlerts: true, jobComplete: false });

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-[900px] mx-auto px-6 md:px-10 lg:px-12 pt-8 pb-20">

        {/* Header */}
        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
        >
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="w-8 h-px bg-stroke" />
            <span className="text-xs text-muted uppercase tracking-[0.3em]">Configuration</span>
          </div>
          <h1 className="text-4xl md:text-5xl text-text-primary leading-[1.1]">
            Account <span className="font-display italic">settings</span>
          </h1>
        </motion.div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Nav */}
          <motion.div
            className="md:w-56 shrink-0"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease }}
          >
            <nav className="space-y-1">
              {SECTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => setSection(s)}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-colors ${
                    section === s ? "bg-text-primary text-bg" : "text-muted hover:bg-white/5 hover:text-text-primary"
                  }`}
                >
                  {s === "Account" && <User className="w-4 h-4 shrink-0" />}
                  {s === "Preferences" && <Moon className="w-4 h-4 shrink-0" />}
                  {s === "Notifications" && <Bell className="w-4 h-4 shrink-0" />}
                  {s === "Storage & Privacy" && <Shield className="w-4 h-4 shrink-0" />}
                  {s}
                </button>
              ))}
            </nav>
          </motion.div>

          {/* Content Area */}
          <motion.div
            className="flex-1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease }}
          >
            {section === "Account" && (
              <div className="bg-surface border border-stroke rounded-3xl p-6 space-y-6">
                {/* Avatar */}
                <div className="flex items-center gap-5 pb-6 border-b border-stroke">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#89AACC] to-[#4E85BF] p-[1px]">
                    <div className="w-full h-full bg-surface rounded-full flex items-center justify-center">
                      <User className="w-7 h-7 text-sky-400" />
                    </div>
                  </div>
                  <div>
                    <p className="text-text-primary font-medium">Aryan Agrawal</p>
                    <p className="text-muted text-sm">aryan@organisation.in</p>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-sky-500/20 text-sky-400 mt-1 inline-block">Researcher</span>
                  </div>
                </div>

                {[
                  { label: "Full Name", value: "Aryan Agrawal" },
                  { label: "Email", value: "aryan@organisation.in" },
                  { label: "Organisation", value: "ISRO / SIH 2026 Team" },
                ].map(f => (
                  <div key={f.label}>
                    <label className="block text-xs text-muted uppercase tracking-wider mb-2">{f.label}</label>
                    <input
                      type="text"
                      defaultValue={f.value}
                      className="w-full bg-bg border border-stroke rounded-2xl px-4 py-3 text-sm text-text-primary outline-none focus:border-sky-500/50 transition-colors"
                    />
                  </div>
                ))}

                <button className="px-5 py-2.5 rounded-full bg-text-primary text-bg text-sm font-medium hover:opacity-90 transition-opacity">
                  Save Changes
                </button>
              </div>
            )}

            {section === "Preferences" && (
              <div className="bg-surface border border-stroke rounded-3xl p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-text-primary mb-1">Default Analysis Mode</h3>
                  <p className="text-xs text-muted mb-4">Controls which mode is selected when you start a new analysis.</p>
                  <div className="flex items-center bg-bg border border-stroke rounded-full p-0.5 w-fit">
                    {["simple", "scientific"].map(m => (
                      <button
                        key={m}
                        onClick={() => setMode(m)}
                        className={`px-5 py-2 rounded-full text-sm font-medium capitalize transition-colors ${mode === m ? "bg-text-primary text-bg" : "text-muted hover:text-text-primary"}`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-stroke">
                  <h3 className="text-sm font-medium text-text-primary mb-1">Theme</h3>
                  <p className="text-xs text-muted mb-4">The interface runs exclusively in dark mode to minimise light pollution during remote sensing sessions.</p>
                  <div className="flex items-center gap-3 px-4 py-3 bg-bg border border-stroke rounded-2xl">
                    <Moon className="w-4 h-4 text-sky-400" />
                    <span className="text-sm text-text-primary flex-1">Dark Mode</span>
                    <Check className="w-4 h-4 text-green-400" />
                  </div>
                </div>
              </div>
            )}

            {section === "Notifications" && (
              <div className="bg-surface border border-stroke rounded-3xl p-6 space-y-4">
                {[
                  { key: "email",        label: "Email Notifications",     desc: "Receive analysis completion reports via email." },
                  { key: "inApp",        label: "In-App Notifications",    desc: "Show notification bell for job updates." },
                  { key: "failureAlerts",label: "Failure Alerts",          desc: "Immediately notify if a validation gate or model fails." },
                  { key: "jobComplete",  label: "Job Completion Alerts",   desc: "Send a notification when every run completes." },
                ].map(n => (
                  <div key={n.key} className="flex items-center justify-between p-4 bg-bg border border-stroke rounded-2xl">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{n.label}</p>
                      <p className="text-xs text-muted mt-0.5">{n.desc}</p>
                    </div>
                    <button
                      onClick={() => setNotifs(prev => ({ ...prev, [n.key]: !prev[n.key as keyof typeof prev] }))}
                      className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ml-4 ${notifs[n.key as keyof typeof notifs] ? "bg-sky-500" : "bg-stroke"}`}
                    >
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${notifs[n.key as keyof typeof notifs] ? "translate-x-5" : "translate-x-1"}`} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {section === "Storage & Privacy" && (
              <div className="bg-surface border border-stroke rounded-3xl p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-text-primary mb-1">Data Sensitivity Label</h3>
                  <p className="text-xs text-muted mb-4">Applied to all uploads and reports in this workspace.</p>
                  <div className="flex gap-2">
                    {["Unclassified", "Internal", "Restricted"].map(l => (
                      <button key={l} className={`px-4 py-2 rounded-full text-xs font-medium border transition-colors ${l === "Internal" ? "border-sky-500/50 text-sky-400 bg-sky-500/10" : "border-stroke text-muted hover:text-text-primary hover:bg-white/5"}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-stroke space-y-4">
                  {[
                    { label: "Upload Retention", value: "90 days" },
                    { label: "Result Cache",     value: "30 days" },
                    { label: "Export Retention", value: "Indefinite" },
                  ].map(r => (
                    <div key={r.label} className="flex items-center justify-between py-3 border-b border-stroke last:border-0">
                      <span className="text-sm text-text-primary">{r.label}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted bg-bg px-2 py-1 rounded border border-stroke font-mono">{r.value}</span>
                        <ChevronRight className="w-4 h-4 text-muted" />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl">
                  <p className="text-sm font-medium text-red-400 mb-1">Danger Zone</p>
                  <p className="text-xs text-muted mb-3">Permanently delete your account and all associated data.</p>
                  <button className="text-xs px-4 py-2 rounded-full border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors">
                    Request Account Deletion
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
