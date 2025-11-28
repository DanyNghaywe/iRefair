'use client';

import { useEffect, useRef, useState } from 'react';

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
};

export default function Home() {
  const [activeFlow, setActiveFlow] = useState<'candidate' | 'referrer'>('candidate');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const palette = ['rgba(61, 210, 240, 0.55)', 'rgba(122, 76, 226, 0.45)'];
    const particles: Particle[] = Array.from({ length: 80 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: 0.8 + Math.random() * 1.6,
      color: palette[Math.floor(Math.random() * palette.length)],
    }));

    let width = window.innerWidth;
    let height = window.innerHeight;
    let animationFrameId = 0;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(ratio, ratio);
    };

    const step = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < -10) particle.x = width + 10;
        if (particle.x > width + 10) particle.x = -10;
        if (particle.y < -10) particle.y = height + 10;
        if (particle.y > height + 10) particle.y = -10;

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(step);
    };

    resize();
    step();
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const isCandidate = activeFlow === 'candidate';

  return (
    <div className="app">
      <div className="background-orbits" aria-hidden="true">
        <div id="container">
          <div className="circle-container" id="circle-container-1">
            <div id="circle1" className="circle" />
          </div>
          <div className="circle-container" id="circle-container-2">
            <div id="circle2" className="circle" />
          </div>
          <div id="particles-js">
            <canvas ref={canvasRef} />
          </div>
        </div>
      </div>

      <div className="board">
        <div className="content">
          <header className="topbar">
            <div className="topbar-copy">
              <p className="eyebrow">Workspaces</p>
              <h1>Match candidates with referrers</h1>
              <p className="lead small-lead">
                Choose a lane below: request a referral as a candidate, or share who you can sponsor as a referrer.
              </p>
            </div>
            <div className="persona-pills" role="list">
              <button
                className={`persona-pill ${isCandidate ? 'is-active' : ''}`}
                type="button"
                role="listitem"
                aria-pressed={isCandidate}
                onClick={() => setActiveFlow('candidate')}
              >
                <div className="pill-badge candidate" aria-hidden="true" />
                <div>
                  <p className="pill-label">Candidate flow</p>
                  <p className="pill-sub">Submit a referral request</p>
                </div>
              </button>
              <button
                className={`persona-pill ${!isCandidate ? 'is-active' : ''}`}
                type="button"
                role="listitem"
                aria-pressed={!isCandidate}
                onClick={() => setActiveFlow('referrer')}
              >
                <div className="pill-badge referrer" aria-hidden="true" />
                <div>
                  <p className="pill-label">Referrer flow</p>
                  <p className="pill-sub">Offer introductions you can make</p>
                </div>
              </button>
            </div>
          </header>

          <main>
            <div className="flow-stack">
              {isCandidate ? (
                <section className="card referral-card" aria-labelledby="referral-title">
                  <div className="card-header">
                    <div>
                      <p className="eyebrow">Candidate flow</p>
                      <h2 id="referral-title">Request a job referral</h2>
                      <p className="lead">
                        Share your background and the roles you want. We&apos;ll match you with referrers when
                        they&apos;re available.
                      </p>
                    </div>
                    <div className="badge">Priority queue</div>
                  </div>

                  <form className="referral-form" action="#" method="post">
                    <fieldset>
                      <legend>Basic information</legend>
                      <div className="field-grid">
                        <div className="field">
                          <label htmlFor="full-name">Full name</label>
                          <input id="full-name" name="full-name" type="text" required />
                        </div>
                        <div className="field">
                          <label htmlFor="email">Email address</label>
                          <input id="email" name="email" type="email" required />
                        </div>
                        <div className="field">
                          <label htmlFor="phone">Phone number</label>
                          <input id="phone" name="phone" type="tel" placeholder="+1 555 123 4567" />
                        </div>
                        <div className="field">
                          <label htmlFor="location">Current location</label>
                          <input id="location" name="location" type="text" required placeholder="City, Country" />
                        </div>
                      </div>
                    </fieldset>

                    <fieldset>
                      <legend>Online presence</legend>
                      <div className="field-grid">
                        <div className="field">
                          <label htmlFor="linkedin">LinkedIn profile URL</label>
                          <input
                            id="linkedin"
                            name="linkedin"
                            type="url"
                            required
                            placeholder="https://linkedin.com/in/"
                          />
                        </div>
                        <div className="field">
                          <label htmlFor="portfolio">Portfolio / Website URL</label>
                          <input id="portfolio" name="portfolio" type="url" placeholder="https://example.com" />
                        </div>
                        <div className="field">
                          <label htmlFor="github">GitHub profile URL</label>
                          <input id="github" name="github" type="url" placeholder="https://github.com/" />
                        </div>
                      </div>
                    </fieldset>

                    <fieldset>
                      <legend>Target role</legend>
                      <div className="field-grid">
                        <div className="field">
                          <label htmlFor="desired-role">Desired role / job title</label>
                          <input
                            id="desired-role"
                            name="desired-role"
                            type="text"
                            required
                            placeholder="e.g. Product Designer"
                          />
                        </div>
                        <div className="field">
                          <label htmlFor="seniority">Seniority</label>
                          <select id="seniority" name="seniority" required defaultValue="">
                            <option value="" disabled>
                              Select
                            </option>
                            <option>Intern</option>
                            <option>Junior</option>
                            <option>Mid-level</option>
                            <option>Senior</option>
                            <option>Lead</option>
                            <option>Director+</option>
                          </select>
                        </div>
                        <div className="field">
                          <label htmlFor="job-type">Job type</label>
                          <select id="job-type" name="job-type" required defaultValue="">
                            <option value="" disabled>
                              Select
                            </option>
                            <option>Full-time</option>
                            <option>Part-time</option>
                            <option>Contract</option>
                            <option>Internship</option>
                          </select>
                        </div>
                        <div className="field">
                          <label htmlFor="work-preference">Work preference</label>
                          <select id="work-preference" name="work-preference" required defaultValue="">
                            <option value="" disabled>
                              Select
                            </option>
                            <option>Remote</option>
                            <option>Hybrid</option>
                            <option>On-site</option>
                          </select>
                        </div>
                        <div className="field field-full">
                          <label htmlFor="preferred-locations">Preferred locations</label>
                          <textarea
                            id="preferred-locations"
                            name="preferred-locations"
                            rows={2}
                            placeholder="e.g. London, Berlin, Remote Europe"
                          />
                        </div>
                      </div>
                    </fieldset>

                    <fieldset>
                      <legend>Experience</legend>
                      <div className="field-grid">
                        <div className="field">
                          <label htmlFor="experience-years">Years of experience</label>
                          <input id="experience-years" name="experience-years" type="number" min="0" required />
                        </div>
                        <div className="field field-full">
                          <label htmlFor="primary-skills">Primary skills</label>
                          <textarea
                            id="primary-skills"
                            name="primary-skills"
                            rows={2}
                            required
                            placeholder="e.g. React, Node.js, Python, Product Management"
                          />
                        </div>
                        <div className="field">
                          <label htmlFor="current-company">Current company</label>
                          <input id="current-company" name="current-company" type="text" />
                        </div>
                        <div className="field">
                          <label htmlFor="current-title">Current job title</label>
                          <input id="current-title" name="current-title" type="text" />
                        </div>
                      </div>
                    </fieldset>

                    <fieldset>
                      <legend>Referral details</legend>
                      <div className="field-grid">
                        <div className="field field-full">
                          <label htmlFor="target-companies">Companies you&apos;re interested in</label>
                          <textarea
                            id="target-companies"
                            name="target-companies"
                            rows={2}
                            required
                            placeholder="List company names and/or job links"
                          />
                        </div>
                        <div className="field">
                          <label htmlFor="has-postings">Do you already have specific job postings?</label>
                          <select id="has-postings" name="has-postings" defaultValue="No">
                            <option>Yes</option>
                            <option>No</option>
                          </select>
                        </div>
                        <div className="field field-full">
                          <label htmlFor="posting-notes">If yes, provide links and notes</label>
                          <textarea
                            id="posting-notes"
                            name="posting-notes"
                            rows={2}
                            placeholder="Add job links, role IDs, or notes"
                          />
                        </div>
                        <div className="field field-full">
                          <label htmlFor="pitch">Short pitch / summary</label>
                          <textarea
                            id="pitch"
                            name="pitch"
                            rows={3}
                            required
                            placeholder="Briefly describe your background and what kind of referral you are looking for"
                          />
                        </div>
                      </div>
                    </fieldset>

                    <fieldset>
                      <legend>Attachments (optional)</legend>
                      <div className="field">
                        <label htmlFor="resume">Upload resume / CV</label>
                        <input id="resume" name="resume" type="file" accept=".pdf,.doc,.docx" />
                      </div>
                    </fieldset>

                    <div className="actions">
                      <button className="btn primary" type="submit">
                        Submit referral request
                      </button>
                      <button className="btn ghost" type="reset">
                        Clear form
                      </button>
                    </div>
                  </form>
                </section>
              ) : (
                <section className="card referrer-card" aria-labelledby="referrer-title">
                  <div className="card-header">
                    <div>
                      <p className="eyebrow">Referrer flow</p>
                      <h2 id="referrer-title">Offer a referral or introduction</h2>
                      <p className="lead">
                        Tell us the teams, roles, and capacity you have. You can also log a specific candidate to
                        refer right now.
                      </p>
                    </div>
                    <div className="badge badge-alt">New</div>
                  </div>

                  <form className="referral-form" action="#" method="post">
                    <fieldset>
                      <legend>About you</legend>
                      <div className="field-grid">
                        <div className="field">
                          <label htmlFor="referrer-name">Full name</label>
                          <input id="referrer-name" name="referrer-name" type="text" required />
                        </div>
                        <div className="field">
                          <label htmlFor="referrer-email">Work email</label>
                          <input id="referrer-email" name="referrer-email" type="email" required />
                        </div>
                        <div className="field">
                          <label htmlFor="referrer-company">Company / affiliation</label>
                          <input id="referrer-company" name="referrer-company" type="text" required />
                        </div>
                        <div className="field">
                          <label htmlFor="referrer-role">Your role / department</label>
                          <input id="referrer-role" name="referrer-role" type="text" required />
                        </div>
                        <div className="field">
                          <label htmlFor="referrer-linkedin">LinkedIn profile</label>
                          <input
                            id="referrer-linkedin"
                            name="referrer-linkedin"
                            type="url"
                            placeholder="https://linkedin.com/in/"
                          />
                        </div>
                        <div className="field">
                          <label htmlFor="referrer-timezone">Location / time zone</label>
                          <input
                            id="referrer-timezone"
                            name="referrer-timezone"
                            type="text"
                            placeholder="e.g. PST, Remote US"
                          />
                        </div>
                      </div>
                    </fieldset>

                    <fieldset>
                      <legend>Referral capacity</legend>
                      <div className="field-grid">
                        <div className="field">
                          <label htmlFor="referral-type">Referral type</label>
                          <select id="referral-type" name="referral-type" required defaultValue="">
                            <option value="" disabled>
                              Select
                            </option>
                            <option>Internal employee referral</option>
                            <option>Recruiter-led introduction</option>
                            <option>Peer recommendation</option>
                          </select>
                        </div>
                        <div className="field">
                          <label htmlFor="monthly-slots">Slots per month</label>
                          <select id="monthly-slots" name="monthly-slots" required defaultValue="">
                            <option value="" disabled>
                              Select
                            </option>
                            <option>1-3 candidates</option>
                            <option>4-8 candidates</option>
                            <option>9-15 candidates</option>
                            <option>Unlimited</option>
                          </select>
                        </div>
                        <div className="field">
                          <label htmlFor="target-roles">Teams / roles you can refer to</label>
                          <textarea
                            id="target-roles"
                            name="target-roles"
                            rows={2}
                            required
                            placeholder="e.g. Product Design, Backend (Go/Java), GTM in EMEA"
                          />
                        </div>
                        <div className="field">
                          <label htmlFor="regions">Regions you can cover</label>
                          <input
                            id="regions"
                            name="regions"
                            type="text"
                            required
                            placeholder="e.g. US, Canada, Europe"
                          />
                        </div>
                        <div className="field field-full">
                          <label htmlFor="constraints">Constraints or compliance notes</label>
                          <textarea
                            id="constraints"
                            name="constraints"
                            rows={2}
                            placeholder="e.g. Only full-time roles, no agency work, NDA needed"
                          />
                        </div>
                      </div>
                    </fieldset>

                    <fieldset>
                      <legend>Candidate you want to refer</legend>
                      <div className="field-grid">
                        <div className="field">
                          <label htmlFor="candidate-name">Candidate full name</label>
                          <input id="candidate-name" name="candidate-name" type="text" required />
                        </div>
                        <div className="field">
                          <label htmlFor="candidate-email">Candidate email</label>
                          <input id="candidate-email" name="candidate-email" type="email" required />
                        </div>
                        <div className="field">
                          <label htmlFor="candidate-role">Role you&apos;re recommending them for</label>
                          <input
                            id="candidate-role"
                            name="candidate-role"
                            type="text"
                            required
                            placeholder="e.g. Senior Product Designer"
                          />
                        </div>
                        <div className="field">
                          <label htmlFor="candidate-resume">Resume / portfolio link</label>
                          <input
                            id="candidate-resume"
                            name="candidate-resume"
                            type="url"
                            placeholder="https://link.to/resume"
                          />
                        </div>
                        <div className="field field-full">
                          <label htmlFor="candidate-context">Context and why they&apos;re great</label>
                          <textarea
                            id="candidate-context"
                            name="candidate-context"
                            rows={3}
                            required
                            placeholder="How you know them, achievements, and the type of intro you want to make"
                          />
                        </div>
                      </div>
                    </fieldset>

                    <div className="actions">
                      <button className="btn primary" type="submit">
                        Submit referrer details
                      </button>
                      <button className="btn ghost" type="reset">
                        Save progress
                      </button>
                    </div>
                  </form>

                  <div className="referrer-metrics" aria-label="Referrer quick stats">
                    <div className="metric-card">
                      <p className="metric-label">Match speed</p>
                      <p className="metric-value">48h</p>
                      <p className="metric-note">We only surface candidates that fit your teams and bandwidth.</p>
                    </div>
                    <div className="metric-card">
                      <p className="metric-label">Visibility</p>
                      <p className="metric-value">Private</p>
                      <p className="metric-note">Your details stay hidden until you accept a pairing.</p>
                    </div>
                    <div className="metric-card">
                      <p className="metric-label">Status</p>
                      <p className="metric-value">Open</p>
                      <p className="metric-note">Tell us when you need to pause referrals or change slots.</p>
                    </div>
                  </div>
                </section>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
