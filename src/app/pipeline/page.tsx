"use client";

import React from "react";
import Image from "next/image";
import { motion, useScroll, useSpring } from "framer-motion";
import { ArrowRight, Shield, Zap, Globe, Activity, ChevronRight, Compass, ArrowUpRight } from "lucide-react";
import { Nav } from "@/components/Nav";
import { StarIcon } from "@/components/StarIcon";
import { Space3D } from "@/components/Space3D";
import { TextReveal } from "@/components/ui/TextReveal";
import { Magnetic } from "@/components/ui/Magnetic";
import { PerspectiveCard } from "@/components/ui/PerspectiveCard";
import Balancer from "react-wrap-balancer";

const phases = [
    {
        id: 0,
        name: "Setup & Acquisition",
        type: "Foundation",
        duration: "Days 1–2",
        deliverable: "Data downloaded, environment configured, catalogs parsed",
        image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop",
        stats: { source: "IRIS FDSN", format: "MiniSEED", network: "XA / 7I" },
    },
    {
        id: 1,
        name: "Pre-Processing",
        type: "Signal Processing",
        duration: "Days 3–6",
        deliverable: "Clean, response-removed waveforms; glitch removal working",
        image: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=2072&auto=format&fit=crop",
        stats: { output: "VEL (m/s)", filter: "4-pole Butterworth", taper: "5% Cosine" },
    },
    {
        id: 2,
        name: "STA/LTA Engine",
        type: "Classical Detection",
        duration: "Days 7–9",
        deliverable: "Multi-band coincidence trigger with tuned thresholds",
        image: "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?q=80&w=1974&auto=format&fit=crop",
        stats: { bands: "5 Filter Banks", trigger: "≥2 Bands", method: "Coincidence" },
    },
    {
        id: 3,
        name: "Feature Engineering",
        type: "Data Science",
        duration: "Days 10–13",
        deliverable: "Full feature matrix; template library built",
        image: "https://images.unsplash.com/photo-1614728423959-346b16f5df73?q=80&w=1974&auto=format&fit=crop",
        stats: { features: "14 Vectors", templates: "28 Clusters", method: "Hilbert + Welch" },
    },
    {
        id: 4,
        name: "Baseline ML",
        type: "Machine Learning",
        duration: "Days 14–16",
        deliverable: "RF + XGBoost trained, F1 > 0.85 on validation",
        image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop",
        stats: { model: "Random Forest", split: "TimeSeriesSplit", f1: "> 0.85" },
    },
    {
        id: 5,
        name: "Deep Learning",
        type: "Neural Networks",
        duration: "Days 17–22",
        deliverable: "CNN + LSTM autoencoder trained, spectrogram branch added",
        image: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=2072&auto=format&fit=crop",
        stats: { model: "1D CNN + LSTM", input: "6000 Samples", branch: "Spectrogram" },
    },
    {
        id: 6,
        name: "Ensemble & Tuning",
        type: "Optimization",
        duration: "Days 23–25",
        deliverable: "Final ensemble, threshold optimization per class",
        image: "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?q=80&w=1974&auto=format&fit=crop",
        stats: { rf: "0.30 weight", cnn: "0.50 weight", lstm: "0.20 weight" },
    },
    {
        id: 7,
        name: "Evaluation",
        type: "Validation",
        duration: "Days 26–28",
        deliverable: "Full catalog comparison, confusion matrix, F1 report",
        image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop",
        stats: { target: "F1 ≥ 0.90", catalog: "MQS + Apollo", tol: "±60 seconds" },
    },
    {
        id: 8,
        name: "Output & Dashboard",
        type: "Delivery",
        duration: "Days 29–30",
        deliverable: "Transmission simulation output, visualization dashboard",
        image: "https://images.unsplash.com/photo-1614728423959-346b16f5df73?q=80&w=1974&auto=format&fit=crop",
        stats: { format: "MiniSEED", compress: ">80% reduction", viz: "4-Panel" },
    },
];

export default function PipelinePage() {
    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    return (
        <div className="min-h-screen bg-[#0E0E0E] text-white selection:bg-red-600/30 overflow-x-hidden relative">
            <motion.div
                className="fixed top-0 left-0 right-0 h-1 bg-red-600 origin-left z-[110]"
                style={{ scaleX }}
            />
            <Space3D />
            <Nav />

            {/* Hero Section */}
            <section className="relative pt-64 pb-32 px-8 z-10">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col gap-12">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8 }}
                            className="inline-flex items-center gap-4 text-red-500 font-bold tracking-[0.4em] uppercase text-[10px]"
                        >
                            <span className="w-12 h-px bg-red-500" />
                            Pipeline Phases
                        </motion.div>

                        <h1 className="text-[12vw] md:text-[10rem] font-light leading-[0.8] tracking-tighter uppercase mb-8">
                            <TextReveal text="Across The" className="inline-block" /> <br />
                            <motion.span
                                initial={{ opacity: 0, skewX: -20 }}
                                animate={{ opacity: 1, skewX: 0 }}
                                transition={{ duration: 1, delay: 0.5 }}
                                className="text-white/20 italic font-thin block md:inline"
                            >
                                Signal
                            </motion.span> <br />
                            <TextReveal text="Horizon" className="inline-block" />
                        </h1>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-end mt-12">
                            <div className="space-y-8">
                                <p className="text-white/50 text-xl md:text-3xl leading-tight font-light max-w-2xl">
                                    <Balancer>
                                        8-phase fully automated pipeline — from raw MiniSEED waveforms to classified seismic events and intelligent transmission simulation.
                                    </Balancer>
                                </p>
                                <div className="flex gap-8">
                                    <Magnetic strength={0.2}>
                                        <button className="flex items-center gap-4 text-xs font-bold uppercase tracking-[0.3em] group">
                                            <span className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center transition-all group-hover:bg-white group-hover:text-black">
                                                <Compass className="w-4 h-4" />
                                            </span>
                                            View Architecture
                                        </button>
                                    </Magnetic>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-12 text-[10px] text-white/30 tracking-[0.3em] uppercase border-t border-white/5 pt-12">
                                <div className="space-y-4">
                                    <span className="block text-white/10">Pipeline Phases</span>
                                    <span className="text-white text-3xl font-light tracking-tighter lowercase">09<span className="text-xs text-red-600 ml-1 uppercase">phases</span></span>
                                </div>
                                <div className="space-y-4">
                                    <span className="block text-white/10">F1 Target</span>
                                    <span className="text-white text-3xl font-light tracking-tighter lowercase">0.90<span className="text-xs text-red-600 ml-1 uppercase">score</span></span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Featured Overview */}
            <section className="px-8 z-10 relative mb-64">
                <div className="max-w-7xl mx-auto">
                    <PerspectiveCard>
                        <div className="relative aspect-[21/9] rounded-[4rem] overflow-hidden group border border-white/5 bg-zinc-900">
                            <Image
                                src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop"
                                alt="Planetary Seismic Pipeline"
                                fill
                                className="object-cover grayscale group-hover:grayscale-0 transition-all duration-[2000ms] group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

                            <div className="absolute inset-0 flex flex-col justify-end p-12 md:p-24">
                                <div className="flex flex-col md:flex-row items-end justify-between gap-12">
                                    <div className="space-y-8 max-w-3xl">
                                        <div className="inline-flex items-center gap-4 text-red-500 font-bold tracking-[0.4em] uppercase text-[10px]">
                                            <span className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
                                            SEISMOS — Dual Body Architecture
                                        </div>
                                        <h2 className="text-4xl md:text-8xl font-light leading-none tracking-tighter uppercase">Separate Models Per Body</h2>
                                        <p className="text-white/40 text-lg md:text-2xl font-light max-w-2xl">Moon Q-factor: 3,000–7,000 vs Mars Q≈300. Distinct STA/LTA params, filter banks, and feature thresholds for each body — never shared.</p>
                                    </div>
                                    <Magnetic strength={0.2}>
                                        <a href="/modules" className="group relative px-16 py-8 rounded-full bg-white text-black font-bold uppercase tracking-[0.3em] text-[10px] transition-all hover:scale-105 overflow-hidden shrink-0 cursor-pointer">
                                            <span className="relative z-10">View Modules</span>
                                            <div className="absolute inset-0 bg-red-600 translate-y-full group-hover:translate-y-0 transition-transform duration-700" />
                                        </a>
                                    </Magnetic>
                                </div>
                            </div>

                            <div className="absolute top-12 right-12 opacity-0 group-hover:opacity-100 transition-opacity duration-1000">
                                <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-3xl flex items-center justify-center border border-white/20">
                                    <ArrowUpRight className="w-8 h-8 text-white" />
                                </div>
                            </div>
                        </div>
                    </PerspectiveCard>
                </div>
            </section>

            {/* Phase Catalog */}
            <section className="py-24 px-8 z-10 relative">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-end gap-12 mb-32 border-b border-white/5 pb-16">
                    <div className="space-y-8">
                        <h2 className="text-6xl md:text-[8rem] font-light uppercase tracking-tighter italic leading-none">Phases</h2>
                        <p className="text-white/20 text-[10px] uppercase tracking-[0.5em] font-bold">30-day execution timeline</p>
                    </div>
                    <div className="flex gap-16 text-[10px] text-white/30 uppercase tracking-[0.4em] font-bold pb-4">
                        <span className="text-red-600 cursor-pointer">Moon</span>
                        <span className="hover:text-white cursor-pointer transition-colors duration-500">Mars</span>
                        <span className="hover:text-white cursor-pointer transition-colors duration-500">Both</span>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {phases.map((phase, i) => (
                        <PerspectiveCard key={i} className="h-full">
                            <div className="group relative flex flex-col justify-between overflow-hidden rounded-[3.5rem] bg-white/[0.01] border border-white/5 backdrop-blur-3xl p-12 min-h-[750px] transition-all duration-1000 hover:bg-white/[0.02] hover:border-red-500/20 h-full">
                                <div className="space-y-12">
                                    <div className="relative h-80 rounded-[2.5rem] overflow-hidden grayscale group-hover:grayscale-0 transition-all duration-1000 group-hover:scale-110 shadow-2xl">
                                        <Image src={phase.image} alt={phase.name} fill className="object-cover" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                        <div className="absolute bottom-6 left-6 inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-xl rounded-full border border-white/10 text-[9px] font-bold tracking-[0.2em] uppercase">
                                            <Activity className="w-3 h-3 text-red-500" />
                                            Phase {String(phase.id).padStart(2, "0")}
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-2">
                                                <h3 className="text-4xl font-light tracking-tight group-hover:text-red-500 transition-colors duration-700">{phase.name}</h3>
                                                <p className="text-white/30 text-[9px] font-bold uppercase tracking-[0.3em]">{phase.type} • {phase.duration}</p>
                                            </div>
                                        </div>
                                        <p className="text-white/40 text-base leading-relaxed font-light">
                                            {phase.deliverable}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-12 space-y-12">
                                    <div className="grid grid-cols-3 gap-8 py-8 border-y border-white/5">
                                        {Object.entries(phase.stats).map(([key, val]) => (
                                            <div key={key} className="space-y-2">
                                                <p className="text-[9px] text-white/20 uppercase tracking-[0.4em] font-bold">{key}</p>
                                                <p className="text-[11px] font-light tracking-widest text-white/60">{val}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <Magnetic strength={0.2}>
                                        <button className="w-full py-8 rounded-full border border-white/10 text-[10px] font-bold uppercase tracking-[0.4em] hover:bg-white hover:text-black transition-all duration-1000 flex items-center justify-center gap-6 group/btn">
                                            Phase Details
                                            <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-2 transition-transform" />
                                        </button>
                                    </Magnetic>
                                </div>

                                <div className="absolute top-12 right-12 opacity-10 group-hover:opacity-100 transition-opacity duration-1000">
                                    <StarIcon className="w-6 h-6 rotate-45" />
                                </div>
                            </div>
                        </PerspectiveCard>
                    ))}
                </div>
            </section>

            {/* Body-Specific Design */}
            <section className="py-64 px-8 bg-white/[0.01] border-y border-white/5 relative z-10">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-24">
                    {[
                        { icon: Shield, title: "Moon — High Q", desc: "Q-factor 3,000–7,000. Near-lossless scattering. Events can last 10–60 minutes. Deep moonquakes repeat in 28 spatial clusters." },
                        { icon: Zap, title: "Mars — Wind-Coupled", desc: "Atmospheric wind coupling dominates noise. Q≈300. SEIS glitch removal critical. InSight captured first M5 marsquake May 2022." },
                        { icon: Globe, title: "Ensemble Strategy", desc: "RF (0.30) + 1D CNN (0.50) + LSTM anomaly boost (0.20). LSTM trained on noise-only — reconstruction error spikes on real events." },
                    ].map((item, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.2 }}
                            viewport={{ once: true }}
                            className="space-y-12 group"
                        >
                            <div className="w-20 h-20 rounded-[2rem] bg-white/[0.02] flex items-center justify-center group-hover:bg-red-600/20 group-hover:border-red-500/30 border border-white/5 transition-all duration-1000">
                                <item.icon className="w-10 h-10 text-red-600 group-hover:scale-110 transition-transform duration-700" />
                            </div>
                            <div className="space-y-6">
                                <h3 className="text-3xl font-light tracking-tight italic">{item.title}</h3>
                                <p className="text-white/30 text-base leading-relaxed font-light">{item.desc}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-96 px-8 relative text-center z-10">
                <div className="max-w-5xl mx-auto space-y-24">
                    <div className="space-y-12">
                        <h2 className="text-[10vw] md:text-[10rem] font-light uppercase tracking-tighter leading-[0.8]">Ready to <br /> <span className="text-white/10 italic">Run it?</span></h2>
                        <p className="text-white/30 text-xl md:text-2xl max-w-2xl mx-auto font-light leading-relaxed">
                            The pipeline targets F1 ≥ 0.90 against official Apollo and MQS catalogs with no manual labeling required.
                        </p>
                    </div>
                    <div className="flex flex-col md:flex-row gap-12 justify-center items-center">
                        <Magnetic strength={0.3}>
                            <button className="group relative px-20 py-10 rounded-full bg-white text-black font-bold uppercase tracking-[0.4em] text-[10px] transition-all hover:scale-105 overflow-hidden">
                                <span className="relative z-10">View Modules</span>
                                <div className="absolute inset-0 bg-red-600 translate-y-full group-hover:translate-y-0 transition-transform duration-700" />
                            </button>
                        </Magnetic>
                        <Magnetic strength={0.3}>
                            <button className="flex items-center gap-8 px-16 py-10 rounded-full border border-white/10 hover:bg-white/5 transition-all uppercase tracking-[0.4em] text-[10px] font-bold group">
                                Architecture Spec
                                <ArrowUpRight className="w-6 h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                            </button>
                        </Magnetic>
                    </div>
                </div>

                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150vw] h-[150vw] border border-white/[0.01] rounded-full pointer-events-none" />
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
                                Seismic Event Intelligence System — automated planetary waveform detection for Apollo and InSight missions.
                            </p>
                        </div>
                        <div className="space-y-10">
                            <h4 className="text-[10px] font-bold uppercase tracking-[0.4em] text-white">Navigation</h4>
                            <div className="flex flex-col gap-6 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                                <a href="/team" className="hover:text-red-500 transition-colors">Team</a>
                                <a href="/pipeline" className="hover:text-red-500 transition-colors">Pipeline</a>
                                <a href="/modules" className="hover:text-red-500 transition-colors">Modules</a>
                            </div>
                        </div>
                        <div className="space-y-10">
                            <h4 className="text-[10px] font-bold uppercase tracking-[0.4em] text-white">Legal</h4>
                            <div className="flex flex-col gap-6 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                                <a href="#" className="hover:text-red-500 transition-colors">Data Licenses</a>
                                <a href="#" className="hover:text-red-500 transition-colors">NASA PDS Terms</a>
                                <a href="#" className="hover:text-red-500 transition-colors">Open Science</a>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-center gap-12 pt-16 border-t border-white/5 text-[10px] text-white/20 uppercase tracking-[0.4em] font-bold">
                        <p>© 2026 SEISMOS — All Systems Operational</p>
                        <div className="flex gap-16">
                            <a href="#" className="hover:text-white transition-colors">Privacy</a>
                            <a href="#" className="hover:text-white transition-colors">Terms</a>
                            <a href="#" className="hover:text-white transition-colors">Cookie Policy</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
