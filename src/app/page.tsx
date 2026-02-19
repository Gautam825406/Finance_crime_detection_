"use client";

import Link from "next/link";

const FEATURES = [
  {
    title: "Money Going in Circles",
    description:
      "You know those sketchy loops where A pays B, B pays C, and somehow C pays A back? We find those. Works for loops up to 5 accounts long, and we check if the timing and amounts actually make sense before raising a flag.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    gradient: "from-violet-500 to-fuchsia-500",
    glow: "group-hover:shadow-violet-500/20",
  },
  {
    title: "Structuring & Smurfing",
    description:
      "Some accounts pull small amounts from a ton of people, then push it all out the other side really fast. If someone's dealing with 10+ different accounts in three days, that's a red flag. Unless they're obviously a shop or running payroll — we account for that.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    gradient: "from-orange-500 to-rose-500",
    glow: "group-hover:shadow-orange-500/20",
  },
  {
    title: "Shell Account Chains",
    description:
      "Ever seen an account that literally just receives money and immediately sends it somewhere else? And the next one does the same thing? We trace those chains — three or more hops through accounts that have almost no other activity. Classic layering.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
    gradient: "from-cyan-500 to-blue-500",
    glow: "group-hover:shadow-cyan-500/20",
  },
  {
    title: "Risk Scores That Make Sense",
    description:
      "We score every account from 0 to 100. Showing up in a money loop? Big jump. Part of a smurfing pattern? Another bump. But here's the thing — if it looks like a legit business or payroll account, we bring the score down. Not everything suspicious is actually bad.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    gradient: "from-emerald-500 to-teal-500",
    glow: "group-hover:shadow-emerald-500/20",
  },
  {
    title: "Visual Network Map",
    description:
      "This is honestly the coolest part. The whole transaction network shows up as an interactive graph — each fraud ring gets its own color, risky accounts glow brighter, and clicking on any node pulls up all the details. You can pan, zoom, the works.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    gradient: "from-amber-500 to-orange-500",
    glow: "group-hover:shadow-amber-500/20",
  },
  {
    title: "Surprisingly Quick",
    description:
      "We were honestly surprised how fast it is. 10K+ transactions process in under 30 seconds, and there's no database involved at all. Everything lives in memory. We were careful about keeping things bounded so it doesn't choke on bigger datasets.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    gradient: "from-blue-500 to-indigo-500",
    glow: "group-hover:shadow-blue-500/20",
  },
];

const TECH_STACK = [
  { name: "Next.js 14", desc: "App Router", icon: "N" },
  { name: "TypeScript", desc: "Strict types", icon: "TS" },
  { name: "TailwindCSS", desc: "Utility-first", icon: "TW" },
  { name: "Cytoscape.js", desc: "Graph viz", icon: "CY" },
  { name: "In-Memory", desc: "No database", icon: "IM" },
  { name: "Vercel", desc: "Serverless", icon: "VR" },
];

const CSV_COLUMNS = [
  { name: "transaction_id", type: "string", example: "TXN_001" },
  { name: "sender_id", type: "string", example: "ACC_00123" },
  { name: "receiver_id", type: "string", example: "ACC_00456" },
  { name: "amount", type: "float", example: "15000.50" },
  { name: "timestamp", type: "datetime", example: "2026-01-15 14:30:00" },
];

const STEPS = [
  {
    num: "01",
    title: "Drop Your File",
    desc: "Just a plain CSV. We need five columns: who sent it, who got it, how much, when it happened, and an ID for the transaction. Nothing fancy.",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
  },
  {
    num: "02",
    title: "Graph Gets Built",
    desc: "Behind the scenes, every account becomes a dot on a graph and every payment becomes an arrow. We sort everything by time so the sequence matters.",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    num: "03",
    title: "Algorithms Do Their Thing",
    desc: "One algorithm chases money loops, another looks for accounts that are funneling cash through too many people, and the third follows money hopping through shell accounts. We filter out the noise.",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    num: "04",
    title: "See What Turned Up",
    desc: "Now the fun part. Explore the graph visually, click on accounts to check their details, browse the fraud rings in a table, or just download everything as JSON.",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    ),
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface-0 text-white noise-bg">
      {/* ─── Header ─── */}
      <header className="glass-strong sticky top-0 z-50 border-b border-white/5">
        <div className="w-full mx-auto px-6 lg:px-12 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              FCDE
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-0.5">
            {["Home", "Features", "How It Works", "Tech", "About"].map((label) => (
              <a
                key={label}
                href={`#${label.toLowerCase().replace(/\s+/g, "-")}`}
                className="text-[13px] text-slate-400 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/5"
              >
                {label}
              </a>
            ))}
            <Link
              href="/analyze"
              className="ml-3 text-[13px] bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-semibold px-5 py-2 rounded-xl transition-all btn-lift"
            >
              Open App
            </Link>
          </nav>

          <Link
            href="/analyze"
            className="md:hidden text-sm bg-gradient-to-r from-blue-600 to-violet-600 text-white font-semibold px-4 py-2 rounded-xl"
          >
            Open App
          </Link>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section id="home" className="relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-radial from-blue-500/8 via-violet-500/4 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-32 -left-40 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl animate-float" />
          <div className="absolute top-48 -right-40 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl animate-float" style={{ animationDelay: "3s" }} />
          <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-30" />
        </div>

        <div className="w-full mx-auto px-6 lg:px-12 pt-24 pb-32 relative">
          <div className="text-center max-w-5xl mx-auto">
            <div className="animate-fade-in-up inline-flex items-center gap-2.5 px-4 py-2 glass rounded-full mb-10">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <span className="text-slate-400 text-xs font-medium tracking-widest uppercase">Built for RIFT 2026 — Graph Theory Track</span>
            </div>

            <h2 className="animate-fade-in-up text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold leading-[1.05] mb-8 tracking-tight" style={{ animationDelay: "100ms" }}>
              <span className="bg-gradient-to-b from-white via-white to-slate-500 bg-clip-text text-transparent">Find the Fraud</span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Hidden in the</span>
              <br />
              <span className="bg-gradient-to-b from-white via-white to-slate-500 bg-clip-text text-transparent">Transaction Graph</span>
            </h2>

            <p className="animate-fade-in-up text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed" style={{ animationDelay: "200ms" }}>
              Give us a CSV of transactions and we&apos;ll map out who&apos;s paying whom. Three
              algorithms dig through the graph looking for money loops, structuring hubs, and
              pass-through shell chains. Everything shows up on an interactive visual you can
              actually poke around in.
            </p>

            <div className="animate-fade-in-up flex items-center justify-center gap-4 flex-wrap" style={{ animationDelay: "300ms" }}>
              <Link
                href="/analyze"
                className="group inline-flex items-center gap-2.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-semibold px-8 py-4 rounded-2xl transition-all btn-lift text-lg"
              >
                Try It Out
                <svg className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 text-slate-300 hover:text-white font-medium px-8 py-4 rounded-2xl transition-all border border-white/10 hover:border-white/20 hover:bg-white/5 text-lg"
              >
                Learn More
              </a>
            </div>
          </div>

          {/* Stats */}
          <div className="animate-fade-in-up grid grid-cols-2 md:grid-cols-4 gap-4 mt-24 max-w-5xl mx-auto" style={{ animationDelay: "400ms" }}>
            {[
              { label: "Handles up to", value: "10K+", icon: "📊" },
              { label: "Done in under", value: "30s", icon: "⚡" },
              { label: "Detection methods", value: "3", icon: "🔍" },
              { label: "DB required", value: "Nope", icon: "🚫" },
            ].map((stat) => (
              <div key={stat.label} className="glass rounded-2xl p-5 text-center hover:bg-white/[0.03] transition-colors">
                <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
                <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="py-28 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/[0.02] to-transparent pointer-events-none" />
        <div className="w-full mx-auto px-6 lg:px-12 relative">
          <div className="text-center mb-20">
            <p className="text-blue-400 text-sm font-semibold tracking-widest uppercase mb-4">Detection Capabilities</p>
            <h3 className="text-4xl md:text-5xl font-bold mb-5 tracking-tight">
              <span className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">What We Look For</span>
            </h3>
            <p className="text-slate-500 max-w-lg mx-auto text-lg leading-relaxed">
              Three different algorithms, each hunting for a different kind of shady pattern. A scoring model pulls it all together.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 stagger-children">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className={`group glass rounded-2xl p-7 hover:bg-white/[0.04] transition-all duration-300 cursor-default ${feature.glow} hover:shadow-2xl`}
              >
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  {feature.icon}
                </div>
                <h4 className="text-white font-semibold text-lg mb-3 tracking-tight">{feature.title}</h4>
                <p className="text-slate-500 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section id="how-it-works" className="py-28 relative">
        <div className="absolute inset-0 bg-surface-1/50 pointer-events-none" />
        <div className="w-full mx-auto px-6 lg:px-12 relative">
          <div className="text-center mb-20">
            <p className="text-cyan-400 text-sm font-semibold tracking-widest uppercase mb-4">Process</p>
            <h3 className="text-4xl md:text-5xl font-bold mb-5 tracking-tight">
              <span className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">How It Works</span>
            </h3>
            <p className="text-slate-500 max-w-lg mx-auto text-lg">It&apos;s really just four steps. Upload your data and let the engine do the rest.</p>
          </div>

          {/* Steps timeline */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-20">
            {STEPS.map((item, idx) => (
              <div key={item.num} className="relative group">
                {/* Connector line (hidden on last item and mobile) */}
                {idx < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[calc(50%+32px)] right-0 h-px bg-gradient-to-r from-slate-700 to-transparent" />
                )}

                <div className="glass rounded-2xl p-7 text-center hover:bg-white/[0.04] transition-all duration-300 h-full">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600/20 to-violet-600/20 border border-blue-500/20 text-blue-400 mb-5 group-hover:scale-110 transition-transform duration-300">
                    {item.icon}
                  </div>
                  <div className="text-[11px] font-bold text-blue-400/60 tracking-widest uppercase mb-2">Step {item.num}</div>
                  <h4 className="text-white font-semibold mb-3 tracking-tight">{item.title}</h4>
                  <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CSV Schema card */}
          <div className="glass rounded-2xl overflow-hidden max-w-4xl mx-auto">
            <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <h4 className="text-slate-300 font-medium text-sm ml-2">Your CSV Should Look Like This</h4>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 uppercase text-xs border-b border-white/5">
                  <th className="px-6 py-3.5 text-left font-medium tracking-wider">Column</th>
                  <th className="px-6 py-3.5 text-left font-medium tracking-wider">Type</th>
                  <th className="px-6 py-3.5 text-left font-medium tracking-wider">Example</th>
                </tr>
              </thead>
              <tbody>
                {CSV_COLUMNS.map((col, idx) => (
                  <tr key={col.name} className={`hover:bg-white/[0.02] transition-colors ${idx < CSV_COLUMNS.length - 1 ? "border-b border-white/[0.03]" : ""}`}>
                    <td className="px-6 py-3 text-blue-400 font-mono text-xs">{col.name}</td>
                    <td className="px-6 py-3 text-slate-500 text-xs">{col.type}</td>
                    <td className="px-6 py-3 text-slate-300 font-mono text-xs">{col.example}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ─── Tech Stack ─── */}
      <section id="tech" className="py-28 relative">
        <div className="w-full mx-auto px-6 lg:px-12">
          <div className="text-center mb-20">
            <p className="text-emerald-400 text-sm font-semibold tracking-widest uppercase mb-4">Stack</p>
            <h3 className="text-4xl md:text-5xl font-bold mb-5 tracking-tight">
              <span className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">What It&apos;s Built With</span>
            </h3>
            <p className="text-slate-500 max-w-lg mx-auto text-lg">Nothing exotic. We picked tools we know well and that play nice together.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 max-w-5xl mx-auto stagger-children">
            {TECH_STACK.map((tech) => (
              <div key={tech.name} className="glass rounded-2xl p-5 text-center hover:bg-white/[0.04] transition-all duration-300 group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center mx-auto mb-3 text-xs font-bold text-slate-300 group-hover:from-blue-600/20 group-hover:to-violet-600/20 group-hover:text-blue-400 transition-all duration-300">
                  {tech.icon}
                </div>
                <p className="text-white font-semibold text-sm">{tech.name}</p>
                <p className="text-slate-600 text-xs mt-1">{tech.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── About ─── */}
      <section id="about" className="py-28 relative">
        <div className="absolute inset-0 bg-surface-1/50 pointer-events-none" />
        <div className="max-w-5xl mx-auto px-6 lg:px-12 text-center relative">
          <p className="text-orange-400 text-sm font-semibold tracking-widest uppercase mb-4">Our Story</p>
          <h3 className="text-4xl md:text-5xl font-bold mb-10 tracking-tight">
            <span className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Why We Built This</span>
          </h3>
          <div className="space-y-6 text-slate-400 text-[17px] leading-relaxed max-w-4xl mx-auto text-left md:text-center">
            <p>
              This started as our <strong className="text-white font-medium">RIFT 2026</strong> hackathon entry for the
              <strong className="text-white font-medium"> Graph Theory Track</strong>. We kept asking ourselves: what if you
              stopped writing fraud rules by hand and just let the shape of the data tell you what&apos;s
              off? Turns out, when you model transactions as a graph, the weird stuff jumps right out.
            </p>
            <p>
              There&apos;s no database here — your CSV goes in, a graph comes out, and three separate
              detectors start poking at it. <strong className="text-violet-400 font-medium">One</strong> chases money
              that loops back to where it started. <strong className="text-orange-400 font-medium">Another</strong> looks
              for accounts that are clearly being used as pass-through funnels.
              <strong className="text-cyan-400 font-medium"> The third</strong> traces long chains of accounts that
              do nothing but forward money along.
            </p>
            <p>
              At the end, every account has a score. Higher means shadier. But we also check for
              normal stuff — payroll patterns, merchant-like behavior, regular recurring payments —
              and lower the score when things look legit. You get an interactive graph to explore and
              a JSON file to take with you.
            </p>
          </div>
          <Link
            href="/analyze"
            className="group inline-flex items-center gap-2.5 mt-12 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-semibold px-8 py-4 rounded-2xl transition-all btn-lift text-lg"
          >
            Try It Now
            <svg className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-28 relative">
        <div className="max-w-5xl mx-auto px-6 lg:px-12 text-center">
          <div className="relative gradient-border rounded-3xl overflow-hidden">
            <div className="bg-gradient-to-br from-surface-2 to-surface-1 p-14 md:p-20">
              {/* Glow effect */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-40 bg-blue-500/10 rounded-full blur-3xl" />
              <div className="relative">
                <h3 className="text-3xl md:text-4xl font-bold text-white mb-5 tracking-tight">Curious what your data looks like as a graph?</h3>
                <p className="text-slate-400 mb-10 max-w-lg mx-auto text-lg leading-relaxed">
                  Throw in a CSV and find out. Takes about 30 seconds. You&apos;ll get a visual map,
                  risk scores for every account, and a downloadable JSON with the full breakdown.
                </p>
                <Link
                  href="/analyze"
                  className="group inline-flex items-center gap-2.5 bg-white text-gray-900 font-semibold px-10 py-4 rounded-2xl transition-all hover:bg-slate-100 btn-lift text-lg"
                >
                  Let&apos;s Go
                  <svg className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-white/5">
        <div className="w-full mx-auto px-6 lg:px-12 py-14">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/10">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                </div>
                <span className="text-white font-bold text-lg tracking-tight">Financial Crime Detection Engine</span>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed max-w-md">
                Our RIFT 2026 hackathon project. We take your transactions, build a graph out of
                them, and hunt for the patterns that scream fraud — money loops, structuring hubs,
                and chains of shell accounts. All in-browser, no database.
              </p>
            </div>
            <div>
              <h4 className="text-slate-400 font-semibold text-xs uppercase tracking-widest mb-5">Navigation</h4>
              <div className="space-y-3">
                {["Home", "Features", "How It Works", "Tech", "About"].map((label) => (
                  <a key={label} href={`#${label.toLowerCase().replace(/\s+/g, "-")}`} className="block text-slate-600 hover:text-slate-300 text-sm transition-colors">
                    {label}
                  </a>
                ))}
                <Link href="/analyze" className="block text-slate-600 hover:text-slate-300 text-sm transition-colors">Analyze</Link>
              </div>
            </div>
            <div>
              <h4 className="text-slate-400 font-semibold text-xs uppercase tracking-widest mb-5">Tech Stack</h4>
              <div className="flex flex-wrap gap-2">
                {["Next.js 14", "TypeScript", "TailwindCSS", "Cytoscape.js", "Vercel"].map((tech) => (
                  <span key={tech} className="px-3 py-1.5 bg-white/[0.03] text-slate-500 rounded-lg text-xs border border-white/5">{tech}</span>
                ))}
              </div>
              <h4 className="text-slate-400 font-semibold text-xs uppercase tracking-widest mt-7 mb-4">Algorithms</h4>
              <div className="flex flex-wrap gap-2">
                {["Cycle DFS", "Smurfing", "Layering", "Scoring"].map((alg) => (
                  <span key={alg} className="px-3 py-1.5 bg-white/[0.03] text-slate-500 rounded-lg text-xs border border-white/5">{alg}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-slate-700 text-xs">&copy; 2026 — Made with too much coffee for RIFT 2026 Hackathon.</p>
            <p className="text-slate-700 text-xs">Graph Theory Track &middot; Open to everyone &middot; No login needed</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
