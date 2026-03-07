"use client";

import React from "react";
import Image from "next/image";
import { motion, useScroll, useSpring } from "framer-motion";
import { Activity, Cpu, Brain, BarChart2, ArrowRight, ArrowUpRight } from "lucide-react";
import { Nav } from "@/components/Nav";
import { StarIcon } from "@/components/StarIcon";
import { Space3D } from "@/components/Space3D";
import { TextReveal } from "@/components/ui/TextReveal";
import { Magnetic } from "@/components/ui/Magnetic";
import { PerspectiveCard } from "@/components/ui/PerspectiveCard";
import Balancer from "react-wrap-balancer";

const modules = [
    {
        title: "Pre-Processing",
        desc: "Instrument response removal (deconvolution to m/s velocity), multi-band filter banks (5 bands), Apollo thermal-rate correction, InSight glitch detection & linear step removal.",
        icon: Activity,
        duration: "Days 3–6",
        level: "Foundation",
        id: "MOD-01"
    },
    {
        title: "STA/LTA Engine",
        desc: "Multi-band coincidence triggering — fire only when ≥2 frequency bands trigger within a 10-second window. Body-specific window params: Moon deep (STA 30s, LTA 600s) through Mars HF (STA 2s, LTA 60s).",
        icon: BarChart2,
        duration: "Days 7–9",
        level: "Detection",
        id: "MOD-02"
    },
    {
        title: "Feature Engineering",
        desc: "14-dimensional feature vectors: RMS, peak amplitude, scattering decay coefficient b, envelope symmetry, dominant frequency, spectral centroid, kurtosis, template cross-correlation against 28 deep moonquake clusters.",
        icon: Cpu,
        duration: "Days 10–13",
        level: "Intermediate",
        id: "MOD-03"
    },
    {
        title: "ML Classification",
        desc: "3-tier ensemble — Random Forest (interpretable baseline), 1D CNN (waveform-native), LSTM Autoencoder (anomaly detection trained on noise only). Final weights: RF×0.30, CNN×0.50, LSTM×0.20.",
        icon: Brain,
        duration: "Days 14–22",
        level: "Expert",
        id: "MOD-04"
    }
];

export default function ModulesPage() {
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
                            Technical Modules
                        </motion.div>

                        <h1 className="text-[12vw] md:text-[10rem] font-light leading-[0.8] tracking-tighter uppercase mb-8">
                            <TextReveal text="Reading" className="inline-block" /> <br />
                            <motion.span
                                initial={{ opacity: 0, skewX: 20 }}
                                animate={{ opacity: 1, skewX: 0 }}
                                transition={{ duration: 1, delay: 0.5 }}
                                className="text-white/20 italic font-thin block md:inline"
                            >
                                The Silent
                            </motion.span> <br />
                            <TextReveal text="Waveform" className="inline-block" />
                        </h1>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-end mt-12">
                            <div className="space-y-8">
                                <p className="text-white/50 text-xl md:text-3xl leading-tight font-light max-w-2xl">
                                    <Balancer>
                                        Four core technical modules transform raw planetary seismic data into intelligently classified events — scientifically grounded at every step.
                                    </Balancer>
                                </p>
                                <div className="flex gap-8">
                                    <Magnetic strength={0.2}>
                                        <a href="/pipeline" className="flex items-center gap-4 text-xs font-bold uppercase tracking-[0.3em] group cursor-pointer">
                                            <span className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center transition-all group-hover:bg-white group-hover:text-black">
                                                <Activity className="w-4 h-4" />
                                            </span>
                                            View Pipeline
                                        </a>
                                    </Magnetic>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-12 text-[10px] text-white/30 tracking-[0.3em] uppercase border-t border-white/5 pt-12">
                                <div className="space-y-4">
                                    <span className="block text-white/10">Event Types</span>
                                    <span className="text-white text-3xl font-light tracking-tighter lowercase">9<span className="text-xs text-red-600 ml-1 uppercase">classes</span></span>
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

            {/* Modules Grid */}
            <section className="py-24 px-8 z-10 relative">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-end gap-12 mb-32 border-b border-white/5 pb-16">
                    <div className="space-y-8">
                        <h2 className="text-6xl md:text-[8rem] font-light uppercase tracking-tighter italic leading-none">Modules</h2>
                        <p className="text-white/20 text-[10px] uppercase tracking-[0.5em] font-bold">SEISMOS Technical Stack</p>
                    </div>
                    <div className="flex gap-16 text-[10px] text-white/30 uppercase tracking-[0.4em] font-bold pb-4">
                        <span className="text-red-600 cursor-pointer">Signal</span>
                        <span className="hover:text-white cursor-pointer transition-colors duration-500">Learning</span>
                        <span className="hover:text-white cursor-pointer transition-colors duration-500">Output</span>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-px bg-white/5 border border-white/5 rounded-[4rem] overflow-hidden backdrop-blur-sm">
                    {modules.map((mod, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            viewport={{ once: true }}
                            className="group bg-[#0E0E0E]/80 p-20 flex flex-col justify-between min-h-[500px] hover:bg-white/[0.02] transition-colors duration-1000"
                        >
                            <div className="space-y-16">
                                <div className="flex justify-between items-start">
                                    <div className="w-20 h-20 rounded-[2rem] bg-white/[0.02] border border-white/5 flex items-center justify-center group-hover:bg-red-600 transition-all duration-700">
                                        <mod.icon className="w-10 h-10 text-red-600 group-hover:text-white group-hover:scale-110 transition-all duration-700" />
                                    </div>
                                    <span className="text-[10px] text-white/10 font-bold uppercase tracking-[0.4em]">{mod.id}</span>
                                </div>

                                <div className="space-y-6">
                                    <h3 className="text-5xl font-light tracking-tight group-hover:text-red-500 transition-colors duration-700">{mod.title}</h3>
                                    <p className="text-white/40 text-lg leading-relaxed max-w-md font-light">
                                        {mod.desc}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-end justify-between pt-20 border-t border-white/5">
                                <div className="grid grid-cols-2 gap-12">
                                    <div className="space-y-2">
                                        <span className="text-[9px] text-white/20 uppercase tracking-[0.4em] font-bold">Duration</span>
                                        <span className="block text-xs font-light tracking-widest uppercase">{mod.duration}</span>
                                    </div>
                                    <div className="space-y-2">
                                        <span className="text-[9px] text-white/20 uppercase tracking-[0.4em] font-bold">Layer</span>
                                        <span className="block text-xs font-light tracking-widest uppercase text-red-600">{mod.level}</span>
                                    </div>
                                </div>
                                <Magnetic strength={0.2}>
                                    <button className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all duration-700">
                                        <ArrowUpRight className="w-6 h-6" />
                                    </button>
                                </Magnetic>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Libraries & Stats */}
            <section className="py-64 px-8 relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-[1000px] h-[1000px] bg-red-600/5 blur-[200px] rounded-full" />
                </div>

                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-px bg-white/5 border border-white/5 rounded-[4rem] overflow-hidden backdrop-blur-sm">
                        {[
                            { label: "Catalog Events", value: "13,000", sub: "Apollo + MQS", suffix: "+" },
                            { label: "Feature Vectors", value: "14", sub: "Per Window", suffix: "" },
                            { label: "F1 Score", value: "0.90", sub: "Min Target", suffix: "+" },
                            { label: "Event Classes", value: "9", sub: "Moon + Mars", suffix: "" },
                        ].map((stat, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                viewport={{ once: true }}
                                className="group bg-[#0E0E0E]/80 p-16 space-y-12 hover:bg-white/[0.02] transition-colors duration-1000"
                            >
                                <div className="space-y-4">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-6xl font-light tracking-tighter italic group-hover:text-red-500 transition-colors duration-1000">{stat.value}</span>
                                        <span className="text-xl font-light text-red-600">{stat.suffix}</span>
                                    </div>
                                    <div className="h-px w-full bg-gradient-to-r from-white/10 to-transparent" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-white uppercase tracking-[0.4em] font-bold mb-2">{stat.label}</p>
                                    <p className="text-[9px] text-white/30 uppercase tracking-[0.2em]">{stat.sub}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Tech Library Showcase */}
            <section className="py-64 px-8 z-10 relative bg-white/[0.01] border-y border-white/5">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row items-end justify-between gap-24 mb-48">
                        <h2 className="text-6xl md:text-[10rem] font-light uppercase tracking-tighter leading-none italic">The <br /> <span className="text-white/20">Stack</span></h2>
                        <div className="max-w-md space-y-12">
                            <p className="text-white/40 text-xl md:text-2xl leading-relaxed font-light">
                                Every library chosen for scientific necessity — not convenience. ObsPy for seismological standards, PyTorch for waveform-native deep learning.
                            </p>
                            <div className="w-24 h-px bg-red-600" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        {[
                            { name: "ObsPy ≥1.4", type: "Seismology Core", img: "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?q=80&w=1974&auto=format&fit=crop" },
                            { name: "PyTorch + TorchVision", type: "Deep Learning", img: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=2072&auto=format&fit=crop" },
                            { name: "scikit-learn + SciPy", type: "ML + Signal Processing", img: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop" },
                        ].map((tech, i) => (
                            <PerspectiveCard key={i}>
                                <div className="group relative h-[600px] rounded-[4rem] overflow-hidden border border-white/5 bg-zinc-900 transition-all duration-1000 hover:border-red-500/30">
                                    <Image src={tech.img} alt={tech.name} fill className="object-cover grayscale group-hover:grayscale-0 transition-all duration-[2000ms] group-hover:scale-110" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                                    <div className="absolute bottom-12 left-12 right-12 flex items-center justify-between">
                                        <div className="space-y-2">
                                            <p className="text-[10px] text-white/40 uppercase tracking-[0.4em] font-bold">{tech.type}</p>
                                            <h4 className="text-3xl font-light tracking-tight">{tech.name}</h4>
                                        </div>
                                        <Magnetic strength={0.2}>
                                            <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/10 group-hover:bg-white group-hover:text-black transition-all duration-700">
                                                <ArrowUpRight className="w-6 h-6" />
                                            </div>
                                        </Magnetic>
                                    </div>
                                </div>
                            </PerspectiveCard>
                        ))}
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-96 px-8 relative text-center z-10">
                <div className="max-w-4xl mx-auto space-y-24">
                    <div className="space-y-12">
                        <h2 className="text-[10vw] md:text-[8rem] font-light uppercase tracking-tighter leading-none">
                            Explore <br />
                            <span className="text-white/20 italic">The Codebase</span>
                        </h2>
                        <p className="text-white/40 text-xl md:text-2xl max-w-2xl mx-auto font-light leading-relaxed">
                            All modules are fully reproducible on raw public data — no manual labeling required. Full source in the SEISMOS repository.
                        </p>
                    </div>
                    <div className="flex justify-center">
                        <Magnetic strength={0.3}>
                            <button className="group relative px-20 py-10 rounded-full bg-white text-black font-bold uppercase tracking-[0.4em] text-[10px] transition-all hover:scale-105 overflow-hidden">
                                <span className="relative z-10">GitHub Repository</span>
                                <div className="absolute inset-0 bg-red-600 translate-y-full group-hover:translate-y-0 transition-transform duration-700" />
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
                                Advancing planetary seismology through rigorous ML-driven signal detection and classification at scale.
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
                            <h4 className="text-[10px] font-bold uppercase tracking-[0.4em] text-white">Research</h4>
                            <div className="flex flex-col gap-6 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                                <a href="https://pds-geosciences.wustl.edu" target="_blank" rel="noreferrer" className="hover:text-red-500 transition-colors">NASA PDS</a>
                                <a href="https://ds.iris.edu" target="_blank" rel="noreferrer" className="hover:text-red-500 transition-colors">IRIS FDSN</a>
                                <a href="https://www.seis-insight.eu" target="_blank" rel="noreferrer" className="hover:text-red-500 transition-colors">InSight Portal</a>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-center gap-12 pt-16 border-t border-white/5 text-[10px] text-white/20 uppercase tracking-[0.4em] font-bold">
                        <p>© 2026 SEISMOS — Academic Division</p>
                        <div className="flex gap-16">
                            <a href="#" className="hover:text-white transition-colors">Privacy</a>
                            <a href="#" className="hover:text-white transition-colors">Ethics</a>
                            <a href="#" className="hover:text-white transition-colors">Academic Terms</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
