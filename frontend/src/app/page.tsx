"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import LoadingScreen from "@/components/LoadingScreen";
import Hero from "@/components/Hero";
import RecentAnalyses from "@/components/RecentAnalyses";
import Stats from "@/components/Stats";
import IntelReports from "@/components/Journal";
import Footer from "@/components/Footer";

export default function Home() {
  const [loading, setLoading] = useState(true);

  return (
    <>
      <AnimatePresence>
        {loading && <LoadingScreen onComplete={() => setLoading(false)} />}
      </AnimatePresence>

      {!loading && (
        <main>
          <Hero />
          <RecentAnalyses />
          <Stats />
          <IntelReports />
          <Footer />
        </main>
      )}
    </>
  );
}

