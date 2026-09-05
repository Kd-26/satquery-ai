"use client";
import { useRef, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const explorations = [
  { id: 1, title: "Celestial Planets", category: "3D Visualization", image: "/explorations/planet.jpeg" },
  { id: 2, title: "ASCII Art Study", category: "Generative Art", image: "/explorations/ascii.jpeg" },
  { id: 3, title: "Atmospheric Smoke", category: "Visual Effects", image: "/explorations/smoke.jpeg" },
  { id: 4, title: "Abstract Cylinder", category: "3D Rendering", image: "/explorations/cylinder.jpeg" },
  { id: 5, title: "Organic Waves", category: "Motion Design", image: "/explorations/wave.jpeg" },
  { id: 6, title: "Geometric Cubes", category: "3D Composition", image: "/explorations/cubes.jpeg" },
];

const leftItems = explorations.filter((_, i) => i % 2 === 0);
const rightItems = explorations.filter((_, i) => i % 2 !== 0);

const ExplorationCard = ({
  item,
  onClick,
}: {
  item: (typeof explorations)[0];
  onClick: () => void;
}) => {
  const rotation = (item.id % 2 === 0 ? 1 : -1) * (1.5 + (item.id % 3));

  return (
    <div
      className="group relative w-full aspect-square cursor-pointer"
      style={{ transform: `rotate(${rotation}deg)` }}
      onClick={onClick}
    >
      {/* Outer border frame */}
      <div className="absolute -inset-4 border border-stroke rounded-[40px] -z-10 group-hover:scale-105 transition-transform duration-700" />

      {/* Blue tint */}
      <div className="absolute inset-0 z-10 bg-blue-500/10 mix-blend-overlay rounded-3xl" />

      {/* Image */}
      <div className="relative h-full w-full rounded-3xl overflow-hidden shadow-2xl shadow-black/20 z-0">
        <img
          src={item.image}
          alt={item.title}
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
        {/* Halftone */}
        <div
          className="absolute inset-0 opacity-20 mix-blend-multiply"
          style={{
            backgroundImage: "radial-gradient(circle, #000 1px, transparent 1px)",
            backgroundSize: "4px 4px",
          }}
        />
        {/* Hover gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </div>

      {/* Hover content */}
      <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500 z-10">
        <span className="text-[10px] text-white/60 uppercase tracking-widest block mb-1">
          {item.category}
        </span>
        <span className="text-white text-lg font-medium">{item.title}</span>
      </div>
    </div>
  );
};

const Explorations = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const leftColRef = useRef<HTMLDivElement>(null);
  const rightColRef = useRef<HTMLDivElement>(null);
  const [lightbox, setLightbox] = useState<(typeof explorations)[0] | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Pin center content
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top top",
        end: "bottom bottom",
        pin: contentRef.current,
        pinSpacing: false,
      });

      // Left column parallax
      gsap.fromTo(
        leftColRef.current,
        { y: "10vh" },
        {
          y: "-120vh",
          ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: 1,
          },
        }
      );

      // Right column parallax
      gsap.fromTo(
        rightColRef.current,
        { y: "40vh" },
        {
          y: "-100vh",
          ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: 1.5,
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  // Close lightbox on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <>
      <section id="explorations" ref={sectionRef} className="relative bg-bg min-h-[300vh] w-full">
        {/* Layer 1: Pinned center content */}
        <div
          ref={contentRef}
          className="h-screen w-full flex items-center justify-center pointer-events-none z-10 relative"
        >
          <div className="max-w-lg px-8 py-10 rounded-3xl bg-transparent text-center pointer-events-auto">
            <div className="inline-flex items-center gap-2 mb-6">
              <span className="w-10 h-px bg-stroke" />
              <span className="text-xs text-muted/60 uppercase tracking-[0.3em]">Explorations</span>
              <span className="w-10 h-px bg-stroke" />
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl text-text-primary leading-[1] mb-6">
              Visual <span className="font-display italic">playground</span>
            </h2>
            <p className="text-muted text-sm md:text-base mb-10 max-w-sm mx-auto leading-relaxed">
              A space for creative experiments, motion studies, and visual explorations.
            </p>
            <a
              href="#"
              className="group relative inline-flex items-center gap-3 px-8 py-3.5 bg-bg border border-transparent rounded-full text-sm text-text-primary transition-colors"
            >
              <span
                className="absolute inset-0 rounded-full p-[2px] bg-gradient-to-r from-[#89AACC] to-[#4E85BF] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ margin: "-2px" }}
              >
                <span className="block w-full h-full rounded-full bg-bg" />
              </span>
              {/* Dribbble icon */}
              <svg
                className="relative z-10 w-5 h-5 group-hover:scale-110 transition-transform duration-300"
                viewBox="0 0 24 24"
                fill="#ea4c89"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm6.605 4.61a8.502 8.502 0 011.93 5.314c-.281-.054-3.101-.629-5.943-.271-.065-.141-.12-.293-.184-.445a25.416 25.416 0 00-.564-1.236c3.145-1.28 4.577-3.124 4.761-3.362zM12 3.475c2.17 0 4.154.813 5.662 2.148-.152.216-1.443 1.941-4.48 3.08-1.399-2.57-2.95-4.675-3.189-5A8.687 8.687 0 0112 3.475zm-3.633.803a53.896 53.896 0 013.167 4.935c-3.992 1.063-7.517 1.04-7.896 1.04a8.581 8.581 0 014.729-5.975zM3.453 12.01v-.26c.37.01 4.512.065 8.775-1.215.245.477.477.965.694 1.453-.109.033-.228.065-.336.098-4.404 1.42-6.747 5.303-6.942 5.629a8.522 8.522 0 01-2.19-5.705zM12 20.547a8.482 8.482 0 01-5.239-1.8c.152-.315 1.888-3.656 6.703-5.337.022-.01.033-.01.054-.022a35.318 35.318 0 011.823 6.475 8.4 8.4 0 01-3.341.684zm4.761-1.465c-.086-.52-.542-3.015-1.659-6.084 2.679-.423 5.022.271 5.314.369a8.468 8.468 0 01-3.655 5.715z" />
              </svg>
              <span className="relative z-10">View on Dribbble</span>
              <svg
                className="relative z-10 w-4 h-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M7 17L17 7M17 7H7M17 7V17" />
              </svg>
            </a>
          </div>
        </div>

        {/* Layer 2: Parallax columns */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-20">
          <div className="max-w-[1400px] mx-auto h-full px-12 md:px-24 grid grid-cols-2 gap-12 md:gap-40">
            {/* Left column */}
            <div ref={leftColRef} className="flex flex-col gap-40 md:gap-96 pointer-events-auto items-center">
              <div className="h-[20vh]" />
              {leftItems.map((item) => (
                <div key={item.id} className="w-full max-w-[320px]">
                  <ExplorationCard item={item} onClick={() => setLightbox(item)} />
                </div>
              ))}
            </div>

            {/* Right column */}
            <div ref={rightColRef} className="flex flex-col gap-40 md:gap-96 pointer-events-auto items-center">
              <div className="h-[40vh]" />
              {rightItems.map((item) => (
                <div key={item.id} className="w-full max-w-[320px]">
                  <ExplorationCard item={item} onClick={() => setLightbox(item)} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
          >
            <motion.div
              className="relative max-w-6xl w-full"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="aspect-[16/10] relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                <img
                  src={lightbox.image}
                  alt={lightbox.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex items-center justify-between mt-4 px-2">
                <span className="text-lg font-display italic tracking-wide text-white">
                  {lightbox.title}
                </span>
                <button
                  onClick={() => setLightbox(null)}
                  className="text-white/60 hover:text-white text-sm uppercase tracking-widest transition-colors"
                >
                  Close [esc]
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Explorations;

