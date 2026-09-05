import { motion } from "framer-motion";

const projects = [
  { slug: "automotive-motion", title: "Automotive Motion", image: "/projects/wireframe.png", gradient: "from-violet-500 via-fuchsia-400/60 via-indigo-500/60 to-transparent" },
  { slug: "urban-architecture", title: "Urban Architecture", image: "/projects/building.png", gradient: "from-sky-500 via-blue-400/60 to-transparent" },
  { slug: "human-perspective", title: "Human Perspective", image: "/projects/person.png", gradient: "from-emerald-500 via-emerald-300/60 via-teal-500/60 to-transparent" },
  { slug: "brand-identity", title: "Brand Identity", image: "/projects/branding.png", gradient: "from-amber-500 via-amber-300/60 via-orange-500/60 to-transparent" },
];

const colSpans = [
  "md:col-span-7",
  "md:col-span-5",
  "md:col-span-5",
  "md:col-span-7",
];

const aspectClasses = [
  "aspect-[4/3]",
  "aspect-[4/3] md:aspect-auto md:h-full",
  "aspect-[4/3] md:aspect-auto md:h-full",
  "aspect-[4/3]",
];

const ease = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

const ViewAllButton = ({ className = "" }: { className?: string }) => (
  <button className={`group relative inline-flex items-center gap-3 px-5 py-3 bg-bg border-2 border-stroke rounded-full text-sm text-muted transition-colors ${className}`}>
    <span className="absolute inset-0 rounded-full p-[2px] bg-gradient-to-r from-[#89AACC] to-[#4E85BF] opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ margin: "-2px" }}>
      <span className="block w-full h-full rounded-full bg-bg" />
    </span>
    <span className="relative z-10">View all work</span>
    <svg className="relative z-10 w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  </button>
);

const SelectedWorks = () => {
  return (
    <section className="bg-bg py-12 md:py-16 overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16">
        {/* Header */}
        <motion.div
          className="flex flex-col md:flex-row md:items-end md:justify-between mb-12 md:mb-16 px-2"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease }}
          viewport={{ once: true, margin: "-100px" }}
        >
          <div>
            <div className="inline-flex items-center gap-2 mb-4">
              <span className="w-8 h-px bg-stroke" />
              <span className="text-xs text-muted uppercase tracking-[0.3em]">Selected Work</span>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl text-text-primary leading-[1.1]">
              Featured{" "}
              <span className="font-display italic">projects</span>
            </h2>
            <p className="text-muted text-sm md:text-base mt-3 max-w-md">
              A selection of projects I've worked on, from concept to launch.
            </p>
          </div>
          <ViewAllButton className="hidden md:inline-flex" />
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-6 px-2">
          {projects.map((project, i) => (
            <motion.div
              key={project.slug}
              className={`${colSpans[i]}`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: i * 0.1, ease }}
              viewport={{ once: true, margin: "-100px" }}
            >
              <div className={`group bg-surface border border-stroke rounded-3xl ${aspectClasses[i]} relative overflow-hidden transition-colors duration-300 hover:border-transparent`}>
                {/* Background image */}
                <div className="absolute inset-0">
                  {project.image ? (
                    <img
                      src={project.image}
                      alt={project.title}
                      className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${project.gradient}`} />
                  )}
                  {/* Halftone overlay */}
                  <div
                    className="absolute inset-0 opacity-20 mix-blend-multiply"
                    style={{
                      backgroundImage: "radial-gradient(circle, #000 1px, transparent 1px)",
                      backgroundSize: "4px 4px",
                    }}
                  />
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-bg/70 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute inset-0 backdrop-blur-[0px] group-hover:backdrop-blur-lg opacity-0 group-hover:opacity-100 transition-all duration-500" />

                {/* Hover label */}
                <div className="absolute inset-0 flex items-center justify-center z-10 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                  <div className={`rounded-full p-[1px] animated-gradient-border bg-gradient-to-r ${project.gradient}`}>
                    <div className="px-4 py-2 md:px-5 rounded-full bg-white text-black text-xs md:text-base font-medium">
                      <span className="font-body">View ΓÇö </span>
                      <span className="font-display italic">{project.title}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Mobile button */}
        <div className="flex justify-center md:hidden mt-12">
          <ViewAllButton />
        </div>
      </div>
    </section>
  );
};

export default SelectedWorks;
