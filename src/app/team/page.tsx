"use client";

import React from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import { Users, Activity, Globe, ArrowUpRight, Cpu, BarChart2, Database } from "lucide-react";
import { Nav } from "@/components/Nav";
import { StarIcon } from "@/components/StarIcon";
import { Space3D } from "@/components/Space3D";
import { TextReveal } from "@/components/ui/TextReveal";
import { Magnetic } from "@/components/ui/Magnetic";
import { PerspectiveCard } from "@/components/ui/PerspectiveCard";
import Balancer from "react-wrap-balancer";

const teamRoles = [
    {
        name: "Seismology Domain Expert",
        role: "Physical Signal Validity",
        icon: Activity,
        bio: "Owns the scientific correctness of every signal processing decision. Validates event taxonomy, tunes STA/LTA thresholds, and ensures all physical interpretations align with planetary seismology literature.",
        responsibilities: ["Event taxonomy", "Threshold tuning", "Physical validity"],
        depth: "Domain Authority"
    },
    {
        name: "Signal Processing Engineer",
        role: "Pre-Processing Pipeline",
        icon: BarChart2,
        bio: "Implements the pre-processing chain — instrument response removal via deconvolution, multi-band filter banks, Apollo temperature drift correction, and InSight glitch detection via first-derivative spike detection.",
        responsibilities: ["STA/LTA engine", "Filter design", "Glitch removal"],
        depth: "Core Infrastructure"
    },
    {
        name: "ML Engineer",
        role: "Classification & Training",
        icon: Cpu,
        bio: "Designs and trains the three-tier ensemble: Random Forest baseline, 1D CNN waveform classifier, and LSTM autoencoder anomaly detector. Evaluates F1 against official Apollo and MQS seismic catalogs.",
        responsibilities: ["Feature engineering", "Model architecture", "Evaluation"],
        depth: "Intelligence Layer"
    },
    {
        name: "Data Engineer",
        role: "Acquisition & Storage",
        icon: Database,
        bio: "Manages IRIS FDSN client connections, MiniSEED I/O, Parquet feature storage, and ground-truth catalog parsing for Apollo PSE and MQS QuakeML formats. Ensures full pipeline reproducibility.",
        responsibilities: ["IRIS FDSN client", "Storage schema", "Catalog parsing"],
        depth: "Data Foundation"
    },
];

export default function TeamPage() {
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
                            Scientific Roles
                        </motion.div>

                        <div className="relative">
                            <h1 className="text-[12vw] md:text-[10rem] font-light leading-[0.8] tracking-tighter uppercase mb-4">
                                <TextReveal text="The Expert" className="inline-block" /> <br />
                                <motion.span
                                    initial={{ opacity: 0, skewX: 20 }}
                                    animate={{ opacity: 1, skewX: 0 }}
                                    transition={{ duration: 1, delay: 0.5 }}
                                    className="text-white/20 italic font-thin block md:inline"
                                >
                                    Signal
                                </motion.span> <br />
                                <span className="relative">
                                    <TextReveal text="Architects" className="inline-block" />
                                    <motion.span
                                        className="absolute -right-[1.5em] top-1/2 w-3 h-3 bg-red-600 rounded-full hidden md:block"
                                        animate={{ scale: [1, 1.5, 1], opacity: [1, 0.4, 1] }}
                                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                    />
                                </span>
                            </h1>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-end mt-12">
                            <div className="space-y-8">
                                <p className="text-white/50 text-xl md:text-3xl leading-tight font-light max-w-2xl">
                                    <Balancer>
                                        Five specialized roles — each owning a distinct layer of the pipeline. Assign roles before code is written. No overlaps, no ambiguity.
                                    </Balancer>
                                </p>
                                <Magnetic strength={0.2}>
                                    <button className="flex items-center gap-4 text-xs font-bold uppercase tracking-[0.3em] group">
                                        <span className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center transition-all group-hover:bg-white group-hover:text-black group-hover:border-white">
                                            <ArrowUpRight className="w-4 h-4" />
                                        </span>
                                        Team Structure
                                    </button>
                                </Magnetic>
                            </div>

                            <div className="grid grid-cols-2 gap-12 text-[10px] text-white/30 tracking-[0.3em] uppercase border-t border-white/5 pt-12">
                                <div className="space-y-4">
                                    <span className="block text-white/10">Core Roles</span>
                                    <span className="text-white text-3xl font-light tracking-tighter lowercase">05<span className="text-xs text-red-600 ml-1 uppercase">roles</span></span>
                                </div>
                                <div className="space-y-4">
                                    <span className="block text-white/10">Success Target</span>
                                    <span className="text-white text-3xl font-light tracking-tighter lowercase">F1<span className="text-xs text-red-600 ml-1 uppercase">≥0.90</span></span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Role Cards Grid */}
            <section className="py-48 px-8 z-10 relative">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16">
                    {teamRoles.map((person, i) => (
                        <PerspectiveCard key={i} className="h-full">
                            <div className="group relative overflow-hidden rounded-[3rem] bg-white/[0.01] border border-white/5 backdrop-blur-3xl p-10 transition-all duration-1000 hover:bg-white/[0.03] hover:border-red-500/20 h-full flex flex-col">
                                <div className="flex flex-col md:flex-row gap-12 flex-1">
                                    {/* Icon */}
                                    <div className="relative shrink-0">
                                        <div className="w-40 h-40 md:w-48 md:h-48 rounded-[2rem] bg-white/[0.02] border border-white/5 flex items-center justify-center group-hover:bg-red-600/10 group-hover:border-red-600/20 transition-all duration-1000">
                                            <person.icon className="w-16 h-16 text-red-600 group-hover:scale-110 transition-transform duration-700" />
                                        </div>
                                        {/* Depth badge */}
                                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/5 backdrop-blur-xl rounded-full border border-white/10 text-[9px] font-bold tracking-[0.2em] uppercase whitespace-nowrap">
                                            {person.depth}
                                        </div>
                                    </div>

                                    <div className="flex flex-col justify-between py-2 flex-1">
                                        <div className="space-y-8">
                                            <div>
                                                <motion.h3 className="text-4xl font-light tracking-tight group-hover:text-red-500 transition-colors duration-700">{person.name}</motion.h3>
                                                <div className="flex items-center gap-3 mt-4">
                                                    <span className="w-8 h-px bg-red-600/50" />
                                                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.3em]">{person.role}</p>
                                                </div>
                                            </div>
                                            <p className="text-white/50 text-base leading-relaxed font-light">
                                                {person.bio}
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-3 gap-6 pt-12 border-t border-white/5 mt-8">
                                            {person.responsibilities.map((resp, j) => (
                                                <div key={j} className="space-y-2">
                                                    <div className="w-6 h-px bg-red-600/40" />
                                                    <p className="text-[9px] text-white/30 uppercase tracking-[0.3em] font-bold leading-tight">{resp}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="absolute top-10 right-10 opacity-10 group-hover:opacity-100 group-hover:text-red-600 transition-all duration-1000">
                                    <StarIcon className="w-6 h-6 rotate-45" />
                                </div>
                            </div>
                        </PerspectiveCard>
                    ))}
                </div>

                {/* 5th role — Visualization & QA */}
                <div className="max-w-7xl mx-auto mt-16">
                    <PerspectiveCard>
                        <div className="group relative overflow-hidden rounded-[3rem] bg-white/[0.01] border border-white/5 backdrop-blur-3xl p-10 transition-all duration-1000 hover:bg-white/[0.03] hover:border-red-500/20">
                            <div className="flex flex-col md:flex-row gap-12 items-center">
                                <div className="relative shrink-0">
                                    <div className="w-40 h-40 rounded-[2rem] bg-white/[0.02] border border-white/5 flex items-center justify-center group-hover:bg-red-600/10 group-hover:border-red-600/20 transition-all duration-1000">
                                        <BarChart2 className="w-16 h-16 text-red-600 group-hover:scale-110 transition-transform duration-700" />
                                    </div>
                                </div>
                                <div className="flex-1 space-y-6">
                                    <div>
                                        <h3 className="text-4xl font-light tracking-tight group-hover:text-red-500 transition-colors duration-700">Visualization & QA Lead</h3>
                                        <div className="flex items-center gap-3 mt-4">
                                            <span className="w-8 h-px bg-red-600/50" />
                                            <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.3em]">Result Verification</p>
                                        </div>
                                    </div>
                                    <p className="text-white/50 text-base leading-relaxed font-light max-w-3xl">
                                        Produces 4-panel waveform visualization dashboards — raw velocity, filtered band, STA/LTA characteristic function, and spectrogram. Runs regression testing against benchmark events like the 1972 M5.5 lunar moonquake and 5 May 2022 M5 marsquake.
                                    </p>
                                </div>
                                <div className="flex flex-col gap-8 shrink-0">
                                    {["Waveform plotting", "Result dashboards", "Regression testing"].map((r, j) => (
                                        <div key={j} className="flex items-center gap-4">
                                            <div className="w-4 h-px bg-red-600/40" />
                                            <p className="text-[9px] text-white/30 uppercase tracking-[0.3em] font-bold">{r}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </PerspectiveCard>
                </div>
            </section>

            {/* Stats Grid */}
            <section className="py-64 px-8 relative">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-[1000px] h-[1000px] bg-red-600/5 blur-[200px] rounded-full" />
                </div>

                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/5 border border-white/5 rounded-[4rem] overflow-hidden backdrop-blur-sm">
                        {[
                            { label: "Core Roles", value: "5", sub: "Full Coverage", suffix: "" },
                            { label: "F1 Target", value: "0.90", sub: "Catalog Verified", suffix: "+" },
                            { label: "Catalogued Events", value: "13k", sub: "Apollo + MQS", suffix: "+" },
                        ].map((stat, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.2 }}
                                viewport={{ once: true }}
                                className="group bg-[#0E0E0E]/80 p-24 space-y-16 hover:bg-white/[0.02] transition-colors duration-1000"
                            >
                                <div className="space-y-4">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-8xl font-light tracking-tighter italic group-hover:text-red-500 transition-colors duration-1000">{stat.value}</span>
                                        <span className="text-2xl font-light text-red-600">{stat.suffix}</span>
                                    </div>
                                    <div className="h-px w-full bg-gradient-to-r from-white/10 to-transparent" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-white uppercase tracking-[0.4em] font-bold mb-2">{stat.label}</p>
                                    <p className="text-[10px] text-white/30 uppercase tracking-[0.2em]">{stat.sub}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Call to Action */}
            <section className="py-96 px-8 relative overflow-hidden">
                <div className="max-w-5xl mx-auto text-center relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                        className="space-y-16"
                    >
                        <h2 className="text-[10vw] md:text-8xl font-light uppercase tracking-tighter leading-none">
                            Join the <br />
                            <span className="text-white/20 italic">Research</span>
                        </h2>
                        <p className="text-white/40 text-xl md:text-2xl max-w-2xl mx-auto font-light leading-relaxed">
                            Reproducible on raw public NASA PDS data. No manual labeling. Open science, open pipeline.
                        </p>

                        <div className="flex flex-col md:flex-row gap-8 justify-center items-center pt-8">
                            <Magnetic strength={0.3}>
                                <button className="group relative px-16 py-8 overflow-hidden rounded-full bg-white text-black font-bold uppercase tracking-[0.3em] text-[10px] transition-all hover:scale-105">
                                    <span className="relative z-10">View Pipeline</span>
                                    <div className="absolute inset-0 bg-red-600 translate-y-full group-hover:translate-y-0 transition-transform duration-700" />
                                </button>
                            </Magnetic>

                            <Magnetic strength={0.3}>
                                <button className="flex items-center gap-6 px-12 py-8 rounded-full border border-white/10 hover:bg-white/5 transition-all uppercase tracking-[0.3em] text-[10px] font-bold group">
                                    <Globe className="w-5 h-5 group-hover:rotate-180 transition-transform duration-1000" />
                                    Open Science
                                </button>
                            </Magnetic>
                        </div>
                    </motion.div>
                </div>

                {/* Cinematic Backdrop */}
                <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150vw] h-[150vw] border border-white/[0.02] rounded-full pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vw] h-[100vw] border border-white/[0.03] rounded-full pointer-events-none" />
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
                                Redefining planetary seismology through next-generation ML detection and open-science reproducibility.
                            </p>
                        </div>
                        <div className="space-y-8">
                            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-white">Navigation</span>
                            <ul className="space-y-4 text-white/40 text-[10px] font-bold uppercase tracking-[0.2em]">
                                <li><a href="/team" className="hover:text-red-500 transition-colors">Team</a></li>
                                <li><a href="/pipeline" className="hover:text-red-500 transition-colors">Pipeline</a></li>
                                <li><a href="/modules" className="hover:text-red-500 transition-colors">Modules</a></li>
                            </ul>
                        </div>
                        <div className="space-y-8">
                            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-white">Data</span>
                            <ul className="space-y-4 text-white/40 text-[10px] font-bold uppercase tracking-[0.2em]">
                                <li><a href="https://pds-geosciences.wustl.edu" target="_blank" rel="noreferrer" className="hover:text-red-500 transition-colors">NASA PDS</a></li>
                                <li><a href="https://ds.iris.edu" target="_blank" rel="noreferrer" className="hover:text-red-500 transition-colors">IRIS FDSN</a></li>
                                <li><a href="https://www.seis-insight.eu" target="_blank" rel="noreferrer" className="hover:text-red-500 transition-colors">InSight Portal</a></li>
                            </ul>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-center gap-8 pt-12 border-t border-white/5 text-[10px] text-white/20 uppercase tracking-[0.3em] font-bold">
                        <div>© 2026 SEISMOS Research Initiative</div>
                        <div className="flex gap-12">
                            <a href="#" className="hover:text-white transition-colors">Privacy</a>
                            <a href="#" className="hover:text-white transition-colors">Terms</a>
                            <a href="#" className="hover:text-white transition-colors">Open License</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
