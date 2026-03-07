"use client";

import React from "react";
import Image from "next/image";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { ArrowRight, Activity, Brain, Cpu, BarChart2, ChevronRight, ArrowUpRight } from "lucide-react";
import { Nav } from "@/components/Nav";
import { StarIcon } from "@/components/StarIcon";
import { Space3D } from "@/components/Space3D";
import { TextReveal } from "@/components/ui/TextReveal";
import { Magnetic } from "@/components/ui/Magnetic";
import { PerspectiveCard } from "@/components/ui/PerspectiveCard";
import Balancer from "react-wrap-balancer";

export default function SeismosLanding() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, -300]);
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  return (
    <div className="min-h-screen bg-[#0E0E0E] text-white selection:bg-red-600/30 overflow-x-hidden relative font-sans antialiased">
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-red-600 origin-left z-[110]"
        style={{ scaleX }}
      />
      <Nav />
      <Space3D />

      {/* Hero Section */}
      <section className="relative h-screen flex flex-col items-center justify-center pt-20 px-8 overflow-hidden">
        <motion.div
          style={{ opacity }}
          className="absolute inset-0 z-0 pointer-events-none"
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150vw] h-[150vw] border border-white/[0.02] rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vw] h-[100vw] border border-white/[0.03] rounded-full" />
        </motion.div>

        <div className="relative z-10 text-center space-y-16 max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="inline-flex items-center gap-6 text-red-500 font-bold tracking-[0.5em] uppercase text-[10px]"
          >
            <span className="w-16 h-px bg-red-500" />
            Planetary Intelligence
            <span className="w-16 h-px bg-red-500" />
          </motion.div>

          <div className="space-y-4">
            <h1 className="text-[12vw] md:text-[14rem] font-light tracking-tighter leading-[0.75] uppercase italic text-white/5 select-none">
              Detect
            </h1>
            <h1 className="text-[12vw] md:text-[14rem] font-light tracking-tighter leading-[0.75] uppercase relative">
              <TextReveal text="Signals" />
              <motion.span
                className="absolute -right-[0.5em] top-1/2 w-4 h-4 bg-red-600 rounded-full blur-[2px]"
                animate={{ scale: [1, 2, 1], opacity: [1, 0.4, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              />
            </h1>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1 }}
            className="flex flex-col md:flex-row items-center justify-center gap-16 pt-12"
          >
            <p className="text-white/40 text-xl md:text-2xl font-light max-w-lg text-center md:text-left leading-relaxed">
              <Balancer>
                Automated planetary seismic detection — ingesting raw Apollo and InSight waveforms, classifying events, and simulating onboard intelligent selection.
              </Balancer>
            </p>
            <div className="flex gap-8">
              <Magnetic strength={0.3}>
                <a href="/pipeline" className="group relative px-12 py-6 overflow-hidden rounded-full bg-white text-black font-bold uppercase tracking-[0.3em] text-[10px] transition-all hover:scale-105 cursor-pointer">
                  <span className="relative z-10">Explore Pipeline</span>
                  <div className="absolute inset-0 bg-red-600 translate-y-full group-hover:translate-y-0 transition-transform duration-700" />
                </a>
              </Magnetic>
            </div>
          </motion.div>
        </div>

        <motion.div
          className="absolute bottom-12 flex flex-col items-center gap-6 opacity-30"
          animate={{ y: [0, 15, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="w-px h-24 bg-gradient-to-b from-white via-white/50 to-transparent" />
          <span className="text-[8px] uppercase tracking-[0.5em] font-bold">Scroll</span>
        </motion.div>
      </section>

      {/* Pipeline Architecture Section */}
      <section className="py-64 px-8 max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col md:flex-row items-end justify-between gap-12 mb-48">
          <div className="space-y-12">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="text-red-500 font-bold tracking-[0.4em] text-[10px] uppercase flex items-center gap-6"
            >
              <div className="w-12 h-px bg-red-500" />
              Pipeline Architecture
            </motion.div>
            <h2 className="text-6xl md:text-[10rem] font-light tracking-tighter uppercase leading-[0.8] italic">
              Core <br /> <span className="text-white/20">Modules</span>
            </h2>
          </div>
          <Magnetic strength={0.2}>
            <div className="w-24 h-24 rounded-full border border-white/10 flex items-center justify-center group cursor-pointer hover:border-white transition-colors duration-700">
              <StarIcon className="w-10 h-10 group-hover:rotate-90 transition-transform duration-1000" />
            </div>
          </Magnetic>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { title: "Pre-Processing", icon: Activity, desc: "Instrument response removal, multi-band filtering, glitch detection, and thermal moonquake flagging." },
            { title: "STA/LTA Engine", icon: BarChart2, desc: "Multi-band short-term/long-term average ratios with coincidence triggering to minimize false positives." },
            { title: "Feature Engineering", icon: Cpu, desc: "Envelope scattering decay, spectral centroid, kurtosis, template cross-correlation with 28 deep moonquake clusters." },
            { title: "ML Classification", icon: Brain, desc: "Random Forest + 1D CNN + LSTM autoencoder ensemble achieving F1 ≥ 0.90 against Apollo/MQS catalogs." },
          ].map((item, i) => (
            <PerspectiveCard key={i}>
              <div className="group h-full p-12 bg-white/[0.01] border border-white/5 rounded-[3rem] hover:bg-white/[0.03] hover:border-red-500/20 transition-all duration-1000 flex flex-col justify-between">
                <div>
                  <item.icon className="w-10 h-10 text-red-600 mb-16 group-hover:scale-110 transition-transform duration-700" />
                  <div className="space-y-6">
                    <h3 className="text-2xl font-light tracking-tight">{item.title}</h3>
                    <p className="text-white/40 text-sm leading-relaxed font-light">{item.desc}</p>
                  </div>
                </div>
                <div className="mt-16 w-12 h-12 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all duration-700">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
              </div>
            </PerspectiveCard>
          ))}
        </div>
      </section>

      {/* Active Datasets */}
      <section className="py-64 px-8 border-y border-white/5 relative z-10 bg-white/[0.01]">
        <div className="max-w-7xl mx-auto space-y-48">
          <div className="flex flex-col md:flex-row items-baseline justify-between gap-12">
            <h2 className="text-6xl md:text-[8rem] font-light uppercase tracking-tighter leading-none">
              Active <br /> <span className="text-white/20">Datasets</span>
            </h2>
            <div className="flex gap-6">
              <Magnetic strength={0.4}>
                <button className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all duration-700">
                  <ChevronRight className="w-6 h-6 rotate-180" />
                </button>
              </Magnetic>
              <Magnetic strength={0.4}>
                <button className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all duration-700">
                  <ChevronRight className="w-6 h-6" />
                </button>
              </Magnetic>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {[
              {
                name: "Apollo PSE — Moon",
                date: "1969–1977",
                dist: "XA · IRIS Network",
                img: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=2072&auto=format&fit=crop",
                label: "13,000+ events"
              },
              {
                name: "InSight SEIS — Mars",
                date: "2018–2022",
                dist: "7I · IRIS Network",
                img: "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?q=80&w=1974&auto=format&fit=crop",
                label: "MQS Catalog"
              },
              {
                name: "Ensemble Output",
                date: "RF + CNN + LSTM",
                dist: "F1 ≥ 0.90 Target",
                img: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop",
                label: "5 Event Classes"
              },
            ].map((trip, i) => (
              <PerspectiveCard key={i}>
                <div className="group relative h-[700px] rounded-[4rem] overflow-hidden bg-zinc-900 border border-white/5 transition-all duration-1000 hover:border-red-500/30">
                  <Image src={trip.img} alt={trip.name} fill className="object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-[2000ms] ease-out" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                  <div className="absolute bottom-16 left-16 right-16 space-y-12">
                    <div className="flex justify-between items-end border-b border-white/10 pb-12">
                      <div className="space-y-4">
                        <h3 className="text-4xl font-light tracking-tight group-hover:text-red-500 transition-colors duration-700">{trip.name}</h3>
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-px bg-red-600/50" />
                          <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.3em]">{trip.dist}</p>
                        </div>
                      </div>
                      <div className="text-right space-y-2">
                        <p className="text-[10px] text-white/20 uppercase tracking-[0.3em] font-bold">Period</p>
                        <p className="text-xl font-light">{trip.date}</p>
                      </div>
                    </div>
                    <Magnetic strength={0.2}>
                      <div className="w-full py-8 bg-white/5 text-white rounded-full font-bold uppercase tracking-[0.3em] text-[10px] opacity-0 group-hover:opacity-100 translate-y-8 group-hover:translate-y-0 transition-all duration-1000 text-center border border-white/10">
                        {trip.label}
                      </div>
                    </Magnetic>
                  </div>

                  <div className="absolute top-12 right-12 opacity-0 group-hover:opacity-100 transition-opacity duration-1000">
                    <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-xl flex items-center justify-center">
                      <ArrowUpRight className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              </PerspectiveCard>
            ))}
          </div>
        </div>
      </section>

      {/* Massive CTA */}
      <section className="py-96 px-8 relative overflow-hidden z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150vw] h-[100vh] bg-red-600/[0.03] blur-[200px] rounded-full pointer-events-none" />
        <div className="max-w-7xl mx-auto text-center space-y-24">
          <motion.h2
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
            viewport={{ once: true }}
            className="text-[10vw] md:text-[12rem] font-light uppercase tracking-tighter leading-none"
          >
            Decode the <br />
            <span className="text-white/20 italic">Seismic Record</span>
          </motion.h2>
          <div className="flex justify-center pt-12">
            <Magnetic strength={0.3}>
              <a href="/pipeline" className="group flex items-center gap-12 px-16 py-10 rounded-full border border-white/10 hover:border-red-600 transition-all duration-1000 bg-[#0E0E0E]/50 backdrop-blur-xl cursor-pointer">
                <span className="text-2xl font-light tracking-[0.3em] uppercase">Run Analysis</span>
                <div className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-all duration-700">
                  <ArrowRight className="w-8 h-8 group-hover:translate-x-1 transition-transform" />
                </div>
              </a>
            </Magnetic>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-32 px-12 border-t border-white/5 relative z-10 bg-[#0E0E0E]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-24 mb-32">
            <div className="col-span-1 md:col-span-2 space-y-12">
              <div className="flex items-center gap-4">
                <StarIcon className="w-10 h-10" />
                <span className="text-3xl font-bold tracking-tighter uppercase">SEISMOS</span>
              </div>
              <p className="text-white/30 text-lg max-w-sm font-light">
                Seismic Event Intelligence System for Multi-Origin Signals — planetary waveform detection for Apollo and InSight missions.
              </p>
            </div>
            <div className="space-y-10">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.4em] text-white">System</h4>
              <div className="flex flex-col gap-6 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                <a href="/team" className="hover:text-red-500 transition-colors">Team</a>
                <a href="/pipeline" className="hover:text-red-500 transition-colors">Pipeline</a>
                <a href="/modules" className="hover:text-red-500 transition-colors">Modules</a>
              </div>
            </div>
            <div className="space-y-10">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.4em] text-white">Data Sources</h4>
              <div className="flex flex-col gap-6 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                <a href="https://pds-geosciences.wustl.edu/missions/apollo/apollo_pse.htm" target="_blank" rel="noreferrer" className="hover:text-red-500 transition-colors">Apollo PSE</a>
                <a href="https://ds.iris.edu" target="_blank" rel="noreferrer" className="hover:text-red-500 transition-colors">IRIS FDSN</a>
                <a href="https://www.seis-insight.eu" target="_blank" rel="noreferrer" className="hover:text-red-500 transition-colors">InSight SEIS</a>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-12 pt-16 border-t border-white/5 text-[10px] text-white/20 uppercase tracking-[0.4em] font-bold">
            <p>© 2026 SEISMOS — All Systems Operational</p>
            <div className="flex gap-16">
              <a href="https://pds-geosciences.wustl.edu" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">NASA PDS</a>
              <a href="https://ds.iris.edu" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">IRIS</a>
              <a href="/pipeline" className="hover:text-white transition-colors">Pipeline</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
