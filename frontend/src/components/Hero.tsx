"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import Hls from "hls.js";
import Navbar from "./Navbar";
import Link from "next/link";

const ROLES = ["Optical", "SAR", "Multispectral", "Temporal"];
const VIDEO_SRC =
  "https://stream.mux.com/Aa02T7oM1wH5Mk5EEVDYhbZ1ChcdhRsS2m1NYyx4Ua1g.m3u8";

const Hero = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [roleIndex, setRoleIndex] = useState(0);

  // HLS video setup
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(VIDEO_SRC);
      hls.attachMedia(video);
      return () => hls.destroy();
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = VIDEO_SRC;
    }
  }, []);

  // Role cycling
  useEffect(() => {
    const interval = setInterval(() => {
      setRoleIndex((i) => (i + 1) % ROLES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // GSAP entrance
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.fromTo(".name-reveal", { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 1.2 }, 0.1);
      tl.fromTo(
        ".blur-in",
        { opacity: 0, filter: "blur(10px)", y: 20 },
        { opacity: 1, filter: "blur(0px)", y: 0, duration: 1, stagger: 0.1 },
        0.3
      );
    }, heroRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={heroRef} className="relative min-h-screen flex flex-col">
      <Navbar />

      {/* Background video */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          className="absolute top-1/2 left-1/2 min-w-full min-h-full -translate-x-1/2 -translate-y-1/2 object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-bg to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6">
        <span className="blur-in text-xs text-muted uppercase tracking-[0.3em] mb-8">
          Remote Sensing Intelligence
        </span>

        <h1 className="name-reveal text-6xl md:text-8xl lg:text-9xl font-display italic leading-[0.9] tracking-tight text-text-primary mb-6">
          SatQuery AI
        </h1>

        <p className="blur-in text-lg md:text-xl lg:text-2xl text-muted mb-10">
          Query-driven{" "}
          <span
            key={roleIndex}
            className="font-display italic text-text-primary animate-role-fade-in inline-block"
          >
            {ROLES[roleIndex]}
          </span>{" "}
          analysis.
        </p>

        <p className="blur-in text-sm md:text-base text-muted leading-relaxed max-w-md mb-12">
          Upload imagery, ask a natural language question, and receive
          scientifically validated answers grounded in remote sensing evidence.
        </p>

        <div className="blur-in flex items-center gap-4">
          <StartAnalysisButton />
          <LearnMoreButton />
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="blur-in absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
        <span className="text-xs text-muted uppercase tracking-[0.2em]">SCROLL</span>
        <div className="w-px h-10 bg-stroke relative overflow-hidden">
          <div className="w-full h-1/2 bg-text-primary animate-scroll-down" />
        </div>
      </div>
    </section>
  );
};

const StartAnalysisButton = () => {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      href="/analyze"
      className="relative rounded-full text-sm transition-transform duration-200 hover:scale-105"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span
        className={`absolute rounded-full accent-gradient transition-opacity duration-300 ${
          hovered ? "opacity-100" : "opacity-0"
        }`}
        style={{ inset: "-2px" }}
      />
      <span
        className={`relative z-10 block px-7 py-3.5 rounded-full transition-colors duration-300 ${
          hovered ? "bg-bg text-text-primary" : "bg-text-primary text-bg"
        }`}
      >
        Start Analysis
      </span>
    </Link>
  );
};

const LearnMoreButton = () => {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      href="/projects"
      className="relative rounded-full text-sm transition-transform duration-200 hover:scale-105"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span
        className={`absolute rounded-full accent-gradient transition-opacity duration-300 ${
          hovered ? "opacity-100" : "opacity-0"
        }`}
        style={{ inset: "-2px" }}
      />
      <span
        className={`relative z-10 block px-7 py-3.5 rounded-full border-2 transition-colors duration-300 ${
          hovered
            ? "border-transparent bg-bg text-text-primary"
            : "border-stroke bg-bg text-text-primary"
        }`}
      >
        See Projects
      </span>
    </Link>
  );
};

export default Hero;
