"use client";

import { useEffect, useRef, useState } from "react";
import { loadGsap } from "./gsapClient";
import { SignalField } from "./SignalField";

const services = [
  {
    number: "01",
    label: "AI voice agents",
    title: "Every call becomes an opportunity.",
    text: "Natural inbound and outbound agents qualify leads, answer questions, book appointments, recover missed calls, and know when a human should step in.",
    tags: ["24/7 reception", "Lead qualification", "Human handoff"],
    color: "mint",
  },
  {
    number: "02",
    label: "Business automation",
    title: "The handoffs happen without the busywork.",
    text: "We connect your forms, inboxes, calendars, CRM, messaging, and internal tools so information moves exactly where the next action needs it.",
    tags: ["CRM workflows", "Appointment logic", "Follow-up"],
    color: "lime",
  },
  {
    number: "03",
    label: "Digital products",
    title: "Web experiences built to do more.",
    text: "Conversion-focused websites, customer portals, dashboards, and custom applications designed as working parts of your operating system.",
    tags: ["Web development", "Portals", "Dashboards"],
    color: "blue",
  },
  {
    number: "04",
    label: "Custom AI",
    title: "Intelligence shaped around your process.",
    text: "Knowledge assistants, call analysis, document workflows, lead scoring, and reporting systems built around the way your team actually works.",
    tags: ["AI assistants", "Call intelligence", "Reporting"],
    color: "violet",
  },
];

const demoModes = {
  inbound: {
    label: "Inbound call",
    status: "Appointment booked",
    transcript: [
      ["Caller", "My AC stopped working and the house is getting warm."],
      ["Flovro agent", "I can help. Is the system making any unusual noise?"],
      ["Caller", "No, it just stopped cooling."],
      ["Flovro agent", "I have a technician available at 4:30 PM. Shall I reserve it?"],
    ],
  },
  recovery: {
    label: "Missed-call recovery",
    status: "Lead recovered",
    transcript: [
      ["System", "Missed call detected. Recovery sequence started."],
      ["Flovro agent", "Sorry we missed you. What can we help with today?"],
      ["Customer", "I need a roof inspection this week."],
      ["System", "Lead qualified, CRM updated, estimator notified."],
    ],
  },
  outbound: {
    label: "Outbound follow-up",
    status: "Interest confirmed",
    transcript: [
      ["Flovro agent", "I’m following up on the quote you requested Tuesday."],
      ["Customer", "Yes, I had one question about the timeline."],
      ["Flovro agent", "Installation usually takes two days. Would you like a specialist to call at 2 PM?"],
      ["System", "Callback scheduled and sales owner notified."],
    ],
  },
} as const;

type DemoMode = keyof typeof demoModes;

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

export function FlovroExperience() {
  const rootRef = useRef<HTMLDivElement>(null);
  const serviceTrackRef = useRef<HTMLDivElement>(null);
  const [demoMode, setDemoMode] = useState<DemoMode>("inbound");

  useEffect(() => {
    const scope = rootRef.current;
    if (!scope) return;
    let cancelled = false;
    let teardown: (() => void) | undefined;

    void loadGsap().then(({ gsap, ScrollTrigger }) => {
      if (cancelled) return;
      const media = gsap.matchMedia();
      const context = gsap.context(() => {
      const intro = gsap.timeline({ defaults: { ease: "flovroEase" } });
      intro
        .to(".loader-word", { yPercent: -110, duration: 0.7 }, 0.55)
        .to(".loader-line", { scaleX: 1, duration: 0.9 }, 0.05)
        .to(".intro-curtain", { yPercent: -100, duration: 1.05 }, 0.9)
        .fromTo(
          ".nav-shell",
          { y: -28, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.8 },
          1.1,
        )
        .fromTo(
          ".hero-line > span",
          { yPercent: 115, rotate: 3 },
          { yPercent: 0, rotate: 0, stagger: 0.09, duration: 1.05 },
          1.05,
        )
        .fromTo(
          ".hero-reveal",
          { y: 24, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, stagger: 0.08, duration: 0.75 },
          1.35,
        );

      media.add(
        {
          desktop: "(min-width: 900px)",
          reduceMotion: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          const { desktop, reduceMotion } = context.conditions as {
            desktop: boolean;
            reduceMotion: boolean;
          };

          if (!reduceMotion) {
            gsap
              .timeline({
                scrollTrigger: {
                  trigger: ".hero",
                  start: "top top",
                  end: "bottom top",
                  scrub: 1,
                },
              })
              .to(".hero-copy", { y: -105, autoAlpha: 0.2, ease: "none" }, 0)
              .to(".hero-side", { y: -55, autoAlpha: 0, ease: "none" }, 0)
              .to(".scroll-cue", { autoAlpha: 0, ease: "none" }, 0);
          }

          if (desktop && !reduceMotion) {
            const track = serviceTrackRef.current;
            if (track) {
              const distance = () => Math.max(0, track.scrollWidth - window.innerWidth + 72);
              gsap.to(track, {
                x: () => -distance(),
                ease: "none",
                scrollTrigger: {
                  trigger: ".systems-section",
                  start: "top top",
                  end: () => `+=${distance() + window.innerHeight * 0.55}`,
                  pin: true,
                  scrub: 0.8,
                  invalidateOnRefresh: true,
                },
              });
            }
          }
        },
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

      gsap
        .timeline({
          scrollTrigger: {
            trigger: ".flow-map",
            start: "top 72%",
            once: true,
          },
        })
        .fromTo(
          ".flow-line-fill",
          { scaleY: 0 },
          { scaleY: 1, duration: 1.7, ease: "power2.inOut" },
        )
        .fromTo(
          ".flow-node",
          { y: 32, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, stagger: 0.13, duration: 0.7, ease: "flovroEase" },
          0.15,
        );

      }, scope);

      teardown = () => {
        media.revert();
        context.revert();
      };
    });

    return () => {
      cancelled = true;
      teardown?.();
    };
  }, []);

  useEffect(() => {
    const scope = rootRef.current;
    if (!scope) return;
    let cancelled = false;
    let teardown: (() => void) | undefined;

    void loadGsap().then(({ gsap }) => {
      if (cancelled) return;
      const context = gsap.context(() => {
        gsap.fromTo(
          ".demo-panel-inner",
          { autoAlpha: 0, y: 12 },
          { autoAlpha: 1, y: 0, duration: 0.45, ease: "power3.out" },
        );
      }, scope);
      teardown = () => context.revert();
    });

    return () => {
      cancelled = true;
      teardown?.();
    };
  }, [demoMode]);

  const demo = demoModes[demoMode];

  return (
    <div className="site-shell" ref={rootRef}>
      <div className="intro-curtain" aria-hidden="true">
        <div className="loader-lockup">
          <div className="loader-mask">
            <span className="loader-word">FLOVRO</span>
          </div>
          <span>INTELLIGENT SYSTEMS / 2026</span>
        </div>
        <div className="loader-line" />
      </div>

      <header className="nav-shell">
        <a className="brand" href="#top" aria-label="Flovro home">
          <BrandMark />
          <span>FLOVRO</span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#systems">Systems</a>
          <a href="#difference">Difference</a>
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
          <div className="hero-orbit hero-orbit-a" aria-hidden="true" />
          <div className="hero-orbit hero-orbit-b" aria-hidden="true" />

          <div className="hero-copy">
            <p className="eyebrow hero-reveal">
              <span className="live-dot" /> AI systems that stay awake
            </p>
            <h1>
              <span className="hero-line">
                <span>Every conversation.</span>
              </span>
              <span className="hero-line hero-line-indent">
                <span>Every workflow.</span>
              </span>
              <span className="hero-line hero-line-accent">
                <span>In motion.</span>
              </span>
            </h1>
            <div className="hero-bottom hero-reveal">
              <p>
                Flovro builds voice agents, connected automations, and digital
                products that help businesses respond faster and operate with
                less friction.
              </p>
              <a className="circle-link" href="#systems" aria-label="Explore our systems">
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
            <span>Scroll to move</span>
            <i />
          </div>
        </section>

        <section className="manifesto section-pad">
          <div className="section-kicker reveal">Why Flovro</div>
          <div className="manifesto-copy reveal">
            <p>
              A missed call is not just a call. It is a customer, a booking, a
              job, a relationship.
            </p>
            <p>
              We connect the entire journey—from first contact to the next best
              action—so opportunity keeps moving even when your team is busy.
            </p>
          </div>
          <div className="manifesto-note reveal">
            <span>Not another disconnected tool.</span>
            <span>A working system around your business.</span>
          </div>
        </section>

        <section className="systems-section" id="systems">
          <div className="systems-inner">
            <div className="systems-heading">
              <div>
                <p className="section-kicker">What we build</p>
                <h2>One partner.<br />A connected system.</h2>
              </div>
              <p>
                Modular enough to start where the friction is. Connected enough
                to transform what happens next.
              </p>
            </div>
            <div className="service-track" ref={serviceTrackRef}>
              {services.map((service) => (
                <article
                  className={`service-card service-${service.color}`}
                  key={service.number}
                >
                  <div className="service-card-top">
                    <span>{service.number}</span>
                    <span>{service.label}</span>
                  </div>
                  <div className="service-graphic" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </div>
                  <div className="service-card-copy">
                    <h3>{service.title}</h3>
                    <p>{service.text}</p>
                  </div>
                  <div className="tag-row">
                    {service.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="voice-lab section-pad" id="difference">
          <div className="voice-intro reveal">
            <p className="section-kicker">Voice intelligence</p>
            <h2>Conversations that<br />actually do something.</h2>
            <p>
              The agent listens, understands intent, takes action across your
              stack, and brings in a person when judgment matters.
            </p>
          </div>

          <div className="voice-console reveal">
            <div className="console-topbar">
              <div>
                <span className="console-live"><i /> Live system</span>
                <span>Flovro Voice / Demo environment</span>
              </div>
              <span>EN-US · 00:42</span>
            </div>
            <div className="console-layout">
              <div className="console-sidebar">
                {(Object.keys(demoModes) as DemoMode[]).map((mode) => (
                  <button
                    className={demoMode === mode ? "active" : ""}
                    key={mode}
                    onClick={() => setDemoMode(mode)}
                    type="button"
                  >
                    <span>{demoModes[mode].label}</span>
                    <i />
                  </button>
                ))}
              </div>
              <div className="demo-panel">
                <div className="demo-panel-inner">
                  <div className="wave-field" aria-hidden="true">
                    {Array.from({ length: 44 }, (_, index) => (
                      <i key={index} style={{ "--wave": index } as React.CSSProperties} />
                    ))}
                  </div>
                  <div className="demo-status">
                    <span>{demo.label}</span>
                    <strong>{demo.status}</strong>
                  </div>
                  <div className="transcript">
                    {demo.transcript.map(([speaker, line], index) => (
                      <div className="transcript-row" key={`${speaker}-${index}`}>
                        <span>{speaker}</span>
                        <p>{line}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="console-footer">
              <span>CRM updated</span>
              <span>Confirmation sent</span>
              <span>Team notified</span>
            </div>
          </div>
        </section>

        <section className="flow-section section-pad">
          <div className="flow-heading reveal">
            <p className="section-kicker">Connected by design</p>
            <h2>From first signal<br />to finished action.</h2>
            <p>
              Your customer experiences one seamless journey. Behind it,
              Flovro coordinates every tool and handoff.
            </p>
          </div>
          <div className="flow-map">
            <div className="flow-line"><div className="flow-line-fill" /></div>
            {[
              ["01", "Customer signal", "Call, form, chat, or missed connection"],
              ["02", "AI understanding", "Intent, urgency, context, and qualification"],
              ["03", "Business action", "Booking, routing, payment, or human handoff"],
              ["04", "System update", "CRM, calendar, notifications, and reporting"],
            ].map(([number, title, text]) => (
              <div className="flow-node" key={number}>
                <span>{number}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
                <i aria-hidden="true" />
              </div>
            ))}
          </div>
        </section>

        <section className="proof-section">
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

        <section className="industries section-pad">
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
