"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { name: "Home", href: "/" },
  { name: "Analyze", href: "/analyze" },
  { name: "Projects", href: "/projects" },
  { name: "Insights", href: "/insights" },
];

const Navbar = () => {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [logoHovered, setLogoHovered] = useState(false);
  const [launchHovered, setLaunchHovered] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 100);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 md:pt-6 px-4">
      <div
        className={`inline-flex items-center rounded-full backdrop-blur-md border border-white/10 bg-surface px-2 py-2 transition-shadow duration-300 ${
          scrolled ? "shadow-md shadow-black/10" : ""
        }`}
      >
        {/* Logo */}
        <button
          className="relative w-9 h-9 rounded-full p-[2px] transition-transform duration-200"
          onMouseEnter={() => setLogoHovered(true)}
          onMouseLeave={() => setLogoHovered(false)}
          style={{
            background: logoHovered
              ? "linear-gradient(90deg, #4E85BF 0%, #89AACC 100%)"
              : "linear-gradient(90deg, #89AACC 0%, #4E85BF 100%)",
          }}
        >
          <span className="flex items-center justify-center w-full h-full rounded-full bg-bg">
            <span
              className={`text-[11px] font-display italic tracking-tighter text-text-primary transition-transform duration-200 ${
                logoHovered ? "scale-110" : ""
              }`}
            >
              SQ
            </span>
          </span>
        </button>

        <span className="hidden sm:block w-px h-5 bg-stroke mx-1" />

        {NAV_LINKS.map((link) => {
          const isActive = link.href === "/" ? pathname === "/" : pathname?.startsWith(link.href);
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`text-xs sm:text-sm rounded-full px-3 sm:px-4 py-1.5 sm:py-2 transition-colors duration-200 ${
                isActive
                  ? "text-text-primary bg-stroke/50"
                  : "text-muted hover:text-text-primary hover:bg-stroke/50"
              }`}
            >
              {link.name}
            </Link>
          );
        })}

        <span className="hidden sm:block w-px h-5 bg-stroke mx-1" />

        {/* Launch Analysis CTA */}
        <Link
          href="/analyze"
          className="relative text-xs sm:text-sm rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-muted hover:text-text-primary transition-colors duration-200"
          onMouseEnter={() => setLaunchHovered(true)}
          onMouseLeave={() => setLaunchHovered(false)}
        >
          <span
            className={`absolute rounded-full transition-opacity duration-300 accent-gradient ${
              launchHovered ? "opacity-100" : "opacity-0"
            }`}
            style={{ inset: "-2px" }}
          />
          <span className="relative z-10 flex items-center gap-1 bg-surface rounded-full px-3 sm:px-4 py-1.5 sm:py-2 -mx-3 sm:-mx-4 -my-1.5 sm:-my-2 backdrop-blur-md">
            New Analysis <span className="text-[10px]">Γåù</span>
          </span>
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
