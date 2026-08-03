"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";
import { loadGsap } from "./gsapClient";
import { SignalField } from "./SignalField";

const webProjects = [
  {
    title: "VaultShield",
    type: "Cybersecurity product",
    description:
      "A trust-led product experience with clear positioning, responsive structure, and focused conversion paths.",
    href: "https://vaultshielddsad.vercel.app/",
    theme: "mint",
  },
  {
    title: "Agency Site",
    type: "Creative agency",
    description:
      "An expressive agency presence shaped by bold typography, fast navigation, and purposeful motion.",
    href: "https://agency-site-chi-bice.vercel.app/",
    theme: "violet",
  },
  {
    title: "Logoipsum",
    type: "Brand experience",
    description:
      "A high-impact landing experience built around visual rhythm, direct messaging, and memorable brand character.",
    href: "https://logoipsum-9u1i.vercel.app/",
    theme: "lime",
  },
  {
    title: "Orlando Dental Care",
    type: "Healthcare website",
    description:
      "A patient-friendly dental website that makes services clear and appointment actions easy to reach.",
    href: "https://orlando-dental-care-one.vercel.app/",
    theme: "blue",
  },
  {
    title: "Lumors",
    type: "Immersive website",
    description:
      "An atmospheric digital showcase balancing visual storytelling with a clean, responsive interface.",
    href: "https://lumors.vercel.app/",
    theme: "blue",
  },
  {
    title: "Terraelix",
    type: "Editorial experience",
    description:
      "A refined landing page with layered content, tactile motion, and a strong editorial hierarchy.",
    href: "https://terraelix-two.vercel.app/",
    theme: "mint",
  },
  {
    title: "Animated Gold",
    type: "Motion showcase",
    description:
      "A motion-first web experiment using depth, pacing, and polished transitions to direct attention.",
    href: "https://animated-gold.vercel.app/",
    theme: "lime",
  },
  {
    title: "Orbis Bay",
    type: "Premium website",
    description:
      "A composed, responsive experience with immersive presentation and a premium visual finish.",
    href: "https://orbis-bay-tau.vercel.app/",
    theme: "violet",
  },
] as const;

const automationProjects = [
  {
    number: "01",
    title: "MediLink AI",
    type: "Multi-agent healthcare automation",
    description:
      "Patient context moves through triage, intelligence, logistics, and doctor review without losing the human decision point.",
    steps: ["Patient intake", "AI triage", "Doctor decision"],
    result: "One coordinated care path",
  },
  {
    number: "02",
    title: "Patient Recovery System",
    type: "n8n engagement workflow",
    description:
      "Missed calls, reminders, and inactive patient lists trigger personalized follow-up and keep appointment status synchronized.",
    steps: ["Recovery trigger", "Smart follow-up", "CRM update"],
    result: "More conversations recovered",
  },
  {
    number: "03",
    title: "VisaGuard AI",
    type: "AI risk-analysis workflow",
    description:
      "Scattered online signals become a structured screening report with traceable evidence and a clear review layer.",
    steps: ["Data capture", "Signal analysis", "Risk report"],
    result: "Faster structured review",
  },
] as const;

const voiceProjects = [
  {
    number: "01",
    title: "Dental Front Desk Agent",
    type: "Inbound patient calls",
    description:
      "Answers common questions, books and reschedules appointments, follows clinic rules, and escalates urgent cases.",
    capabilities: ["24/7 answering", "Calendar booking", "Urgent routing"],
    status: "Inbound",
  },
  {
    number: "02",
    title: "Home Services Dispatcher",
    type: "Lead capture and dispatch",
    description:
      "Qualifies the job, captures the service address, identifies emergencies, and routes every caller into the right workflow.",
    capabilities: ["Lead qualification", "Emergency triage", "CRM handoff"],
    status: "Inbound + outbound",
  },
  {
    number: "03",
    title: "Follow-up & Recovery Agent",
    type: "Revenue recovery calls",
    description:
      "Calls back missed leads, confirms interest, handles reminders, and transfers high-intent conversations to the team.",
    capabilities: ["Missed-call recovery", "Reminders", "Live transfer"],
    status: "Outbound",
  },
] as const;

const voiceBars = [36, 62, 45, 84, 56, 100, 72, 42, 88, 52, 78, 60];

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

function Arrow() {
  return <span aria-hidden="true">↗</span>;
}

function scrollProjectRail(
  rail: HTMLDivElement | null,
  direction: -1 | 1,
) {
  if (!rail) return;

  rail.scrollBy({
    left: direction * Math.max(rail.clientWidth * 0.82, 320),
    behavior: "smooth",
  });
}

function RailControls({
  label,
  onPrevious,
  onNext,
}: {
  label: string;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div
      className="work-rail-controls"
      role="group"
      aria-label={`${label} project navigation`}
    >
      <span>Scroll projects</span>
      <button
        type="button"
        onClick={onPrevious}
        aria-label={`Previous ${label} project`}
      >
        <span aria-hidden="true">←</span>
      </button>
      <button
        type="button"
        onClick={onNext}
        aria-label={`Next ${label} project`}
      >
        <span aria-hidden="true">→</span>
      </button>
    </div>
  );
}

export function FlovroExperience() {
  const rootRef = useRef<HTMLDivElement>(null);
  const webRailRef = useRef<HTMLDivElement>(null);
  const automationRailRef = useRef<HTMLDivElement>(null);
  const voiceRailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scope = rootRef.current;
    if (!scope) return;
    let cancelled = false;
    let teardown: (() => void) | undefined;

    void loadGsap().then(({ gsap, ScrollTrigger }) => {
      if (cancelled) return;
      const context = gsap.context(() => {
        const intro = gsap.timeline({ defaults: { ease: "flovroEase" } });
        intro
          .fromTo(
            ".nav-shell",
            { y: -28, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: 0.8 },
            0.05,
          )
          .fromTo(
            ".hero-line > span",
            { yPercent: 115, rotate: 3 },
            { yPercent: 0, rotate: 0, stagger: 0.09, duration: 1.05 },
            0,
          )
          .fromTo(
            ".hero-reveal",
            { y: 24, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, stagger: 0.08, duration: 0.75 },
            0.18,
          );

        ScrollTrigger.batch(".reveal", {
          start: "top 84%",
          once: true,
          onEnter: (items) =>
            gsap.fromTo(
              items,
              { y: 54, autoAlpha: 0 },
              {
                y: 0,
                autoAlpha: 1,
                duration: 1,
                stagger: 0.08,
                ease: "flovroEase",
                overwrite: true,
              },
            ),
        });
      }, scope);

      teardown = () => {
        context.revert();
      };
    });

    return () => {
      cancelled = true;
      teardown?.();
    };
  }, []);

  return (
    <div className="site-shell" ref={rootRef}>
      <header className="nav-shell">
        <a className="brand" href="#top" aria-label="Flovro home">
          <BrandMark />
          <span>FLOVRO</span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#work">Work</a>
          <a href="#process">Process</a>
        </nav>
        <a className="nav-cta" href="#contact">
          Start a project <Arrow />
        </a>
      </header>

      <main>
        <section className="hero" id="top">
          <SignalField />
          <div className="hero-grid" />

          <div className="hero-copy">
            <p className="eyebrow hero-reveal">
              <span className="live-dot" /> AI systems that stay awake
            </p>
            <h1>
              <span className="hero-line">
                <span>Calls answered.</span>
              </span>
              <span className="hero-line hero-line-indent">
                <span>Work automated.</span>
              </span>
              <span className="hero-line hero-line-accent">
                <span>Growth in motion.</span>
              </span>
            </h1>
            <div className="hero-bottom hero-reveal">
              <p>
                Flovro builds voice agents, connected automations, and digital
                products that help businesses respond faster and operate with
                less friction.
              </p>
              <a className="circle-link" href="#work" aria-label="Explore our work">
                <span>Explore</span>
                <Arrow />
              </a>
            </div>
          </div>

          <aside className="hero-side hero-reveal" aria-label="Core capabilities">
            <span>Voice</span>
            <span>Automate</span>
            <span>Build</span>
          </aside>

          <div className="hero-status hero-reveal">
            <div>
              <strong>24/7</strong>
              <span>Customer response</span>
            </div>
            <div>
              <strong>&lt;2s</strong>
              <span>Answer speed</span>
            </div>
            <div>
              <strong>01</strong>
              <span>Connected stack</span>
            </div>
          </div>

          <div className="scroll-cue hero-reveal" aria-hidden="true">
            <span>Scroll to explore</span>
            <i />
          </div>
        </section>

        <nav className="section-index section-pad" aria-label="Page sections">
          {[
            ["01", "Work", "#work"],
            ["02", "Services", "#web-development"],
            ["03", "Benefits", "#benefits"],
            ["04", "Industries", "#industries"],
            ["05", "Process", "#process"],
            ["06", "Contact", "#contact"],
          ].map(([number, label, href]) => (
            <a className="section-index-link" href={href} key={href}>
              <span>{number}</span>
              <strong>{label}</strong>
            </a>
          ))}
        </nav>

        <section className="work-overview section-pad" id="work">
          <div className="work-overview-heading reveal">
            <p className="section-kicker">Selected work</p>
            <h2>Three capabilities.<br />One connected growth system.</h2>
            <p>
              Explore the customer-facing experience, the automation behind it,
              and the voice layer that keeps every opportunity moving.
            </p>
          </div>
          <nav className="work-category-nav" aria-label="Work categories">
            {[
              ["01", "Web development", "#web-development"],
              ["02", "AI automations", "#ai-automations"],
              ["03", "Voice agents", "#voice-agents"],
            ].map(([number, label, href]) => (
              <a href={href} key={href}>
                <span>{number}</span>
                <strong>{label}</strong>
                <Arrow />
              </a>
            ))}
          </nav>
        </section>

        <section className="work-section web-work section-pad" id="web-development">
          <div className="work-heading reveal">
            <p className="section-kicker">01 / Web development projects</p>
            <h2>Digital experiences built to look distinct and convert clearly.</h2>
            <p>
              Responsive product, service, and brand websites with strong
              hierarchy, purposeful motion, and business-ready performance.
            </p>
          </div>
          <RailControls
            label="web development"
            onPrevious={() => scrollProjectRail(webRailRef.current, -1)}
            onNext={() => scrollProjectRail(webRailRef.current, 1)}
          />
          <div
            className="web-work-grid work-rail"
            ref={webRailRef}
            role="region"
            tabIndex={0}
            aria-label="Web development project carousel"
          >
            {webProjects.map((project, index) => (
              <article className={`web-work-card work-${project.theme} reveal`} key={project.href}>
                <a href={project.href} target="_blank" rel="noreferrer">
                  <div className="web-work-preview" aria-hidden="true">
                    <div className="preview-chrome"><i /><i /><i /><span>flovro / {String(index + 1).padStart(2, "0")}</span></div>
                    <div className="preview-canvas">
                      <span>{project.title}</span>
                      <i />
                      <i />
                    </div>
                  </div>
                  <div className="web-work-copy">
                    <span>{String(index + 1).padStart(2, "0")} · {project.type}</span>
                    <h3>{project.title}</h3>
                    <p>{project.description}</p>
                    <strong>Visit live site <Arrow /></strong>
                  </div>
                </a>
              </article>
            ))}
          </div>
        </section>

        <section className="work-section automation-work section-pad" id="ai-automations">
          <div className="work-heading reveal">
            <p className="section-kicker">02 / AI automations</p>
            <h2>Intelligent workflows that keep the business moving.</h2>
            <p>
              Multi-step systems connecting data, AI decisions, people, and
              the tools already running daily operations.
            </p>
          </div>
          <RailControls
            label="workflow automation"
            onPrevious={() => scrollProjectRail(automationRailRef.current, -1)}
            onNext={() => scrollProjectRail(automationRailRef.current, 1)}
          />
          <div
            className="automation-work-grid work-rail"
            ref={automationRailRef}
            role="region"
            tabIndex={0}
            aria-label="Workflow automation project carousel"
          >
            {automationProjects.map((project) => (
              <article className="automation-work-card reveal" key={project.title}>
                <div className="automation-work-top">
                  <span>{project.number}</span>
                  <span>{project.type}</span>
                </div>
                <div className="automation-nodes" aria-hidden="true">
                  {project.steps.map((step, index) => (
                    <span key={step}>
                      <i>{String(index + 1).padStart(2, "0")}</i>
                      {step}
                    </span>
                  ))}
                </div>
                <h3>{project.title}</h3>
                <p>{project.description}</p>
                <div className="automation-result">
                  <span>Outcome</span>
                  <strong>{project.result}</strong>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="work-section voice-work section-pad" id="voice-agents">
          <div className="work-heading reveal">
            <p className="section-kicker">03 / Voice agents</p>
            <h2>AI callers that sound ready for the job.</h2>
            <p>
              Practical inbound and outbound agents with clear guardrails,
              natural conversations, and dependable human handoffs.
            </p>
          </div>
          <RailControls
            label="voice agent"
            onPrevious={() => scrollProjectRail(voiceRailRef.current, -1)}
            onNext={() => scrollProjectRail(voiceRailRef.current, 1)}
          />
          <div
            className="voice-work-grid work-rail"
            ref={voiceRailRef}
            role="region"
            tabIndex={0}
            aria-label="Voice agent project carousel"
          >
            {voiceProjects.map((project) => (
              <article className="voice-work-card reveal" key={project.title}>
                <div className="voice-work-top">
                  <span>{project.number}</span>
                  <span><i /> {project.status}</span>
                </div>
                <div className="agent-wave" aria-hidden="true">
                  {voiceBars.map((height, index) => (
                    <i
                      key={`${project.number}-${index}`}
                      style={{
                        "--agent-height": `${height}%`,
                        "--agent-delay": `${index * -68}ms`,
                      } as CSSProperties}
                    />
                  ))}
                </div>
                <span className="voice-work-type">{project.type}</span>
                <h3>{project.title}</h3>
                <p>{project.description}</p>
                <div className="voice-capabilities">
                  {project.capabilities.map((capability) => (
                    <span key={capability}>{capability}</span>
                  ))}
                </div>
                <a href={`mailto:hello@flovro.com?subject=${encodeURIComponent(`${project.title} inquiry`)}`}>
                  Build an agent like this <Arrow />
                </a>
              </article>
            ))}
          </div>
        </section>

        <section className="proof-section" id="benefits">
          <div className="proof-grid-bg" aria-hidden="true" />
          <div className="proof-top section-pad reveal">
            <p className="section-kicker">The operating advantage</p>
            <h2>Always available.<br />Never disconnected.</h2>
          </div>
          <div className="metric-grid section-pad">
            <article className="metric reveal">
              <strong>100%</strong>
              <span>of valuable calls get a response path</span>
            </article>
            <article className="metric reveal">
              <strong>24/7</strong>
              <span>coverage for customers across time zones</span>
            </article>
            <article className="metric reveal">
              <strong>1×</strong>
              <span>source of truth across your connected stack</span>
            </article>
            <article className="metric metric-note reveal">
              <p>
                Built for outcomes: faster response, consistent follow-up,
                clearer operations, and more room for your people to do their
                best work.
              </p>
            </article>
          </div>
        </section>

        <section className="industries section-pad" id="industries">
          <div className="industries-heading reveal">
            <p className="section-kicker">Built around real work</p>
            <h2>One intelligence layer.<br />Many business realities.</h2>
          </div>
          <div className="industry-list">
            {[
              ["Home services", "Emergency calls, dispatch, estimates, follow-up"],
              ["Healthcare", "Front-desk support, booking, reminders, reactivation"],
              ["Real estate", "Inquiry qualification, viewings, maintenance routing"],
              ["Professional services", "Client intake, consultation booking, documents"],
              ["E-commerce", "Order support, returns, reactivation, segmentation"],
            ].map(([title, text], index) => (
              <article className="industry-row reveal" key={title}>
                <span>0{index + 1}</span>
                <h3>{title}</h3>
                <p>{text}</p>
                <Arrow />
              </article>
            ))}
          </div>
        </section>

        <section className="process section-pad" id="process">
          <div className="process-heading reveal">
            <p className="section-kicker">How we move</p>
            <h2>Clarity first.<br />Then velocity.</h2>
          </div>
          <div className="process-steps">
            {[
              ["01", "Discover", "We find the dropped calls, repetitive tasks, and broken handoffs that cost time or opportunity."],
              ["02", "Map", "We design the full customer and operational journey, including where human judgment stays essential."],
              ["03", "Build", "We develop, integrate, and test the voice, workflow, web, and reporting layers as one system."],
              ["04", "Improve", "We launch, observe real usage, and tune the experience around measurable business outcomes."],
            ].map(([number, title, text]) => (
              <article className="process-card reveal" key={number}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="contact-section" id="contact">
          <div className="contact-signal" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <div className="contact-content section-pad reveal">
            <p className="section-kicker">Your next system</p>
            <h2>
              Make your business<br />impossible to miss.
            </h2>
            <p>
              Tell us where conversations stall or work slows down. We’ll map
              the shortest route to a system that keeps moving.
            </p>
            <a className="contact-button" href="mailto:hello@flovro.com?subject=Build%20with%20Flovro">
              <span>Start a conversation</span>
              <Arrow />
            </a>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-brand">
          <BrandMark />
          <span>FLOVRO</span>
        </div>
        <p>AI voice agents · Business automation · Digital products</p>
        <div>
          <span>© 2026 Flovro</span>
          <a href="#top">Back to top ↑</a>
        </div>
      </footer>
    </div>
  );
}
