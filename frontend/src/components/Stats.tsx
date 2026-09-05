import { motion } from "framer-motion";

const stats = [
  { number: "94%", label: "Mean Confidence", sublabel: "Average validated answer confidence across all analyses run on the platform." },
  { number: "12+", label: "Sensor Types", sublabel: "Optical, SAR, multispectral, and thermal imagery natively supported." },
  { number: "10m", label: "Best Resolution", sublabel: "Down to 10m GSD with Sentinel-2 and compatible high-resolution sensors." },
];

const ease = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

const Stats = () => {
  return (
    <section className="relative bg-bg py-16 md:py-24">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 lg:px-16">
        {/* Header */}
        <motion.div
          className="mb-12 md:mb-16 px-2"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease }}
          viewport={{ once: true, margin: "-100px" }}
        >
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="w-8 h-px bg-stroke" />
            <span className="text-xs text-muted uppercase tracking-[0.3em]">Stats &amp; Facts</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl text-text-primary leading-[1.1]">
            Built for <span className="font-display italic">precision</span>
          </h2>
          <p className="text-muted text-sm md:text-base mt-3 max-w-2xl">
            SatQuery AI is engineered for scientific rigor. Every answer is grounded in validated metadata, sensor-specific analysis, and deterministic measurements.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-16 lg:gap-16">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              className={`flex flex-col gap-6 ${i === 2 ? "sm:col-span-2 lg:col-span-1" : ""}`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              viewport={{ once: true }}
            >
              <span className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-medium text-text-primary tracking-tighter">
                {stat.number}
              </span>
              <div className="w-full h-px bg-stroke" />
              <div>
                <p className="text-xl md:text-2xl font-bold text-text-primary mb-2">{stat.label}</p>
                <p className="text-sm text-muted">{stat.sublabel}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Stats;
