import { ParticlesBackground } from "@/components/ParticlesBackground";

export default function Loading() {
  return (
    <div className="app">
      <div className="background-hero" aria-hidden="true" />
      <ParticlesBackground />

      <div className="board loader-board">
        <header className="app-logo" aria-label="iRefair">
          <span className="app-logo__name">iRefair</span>
        </header>

        <div className="loader-shell" role="status" aria-live="polite" aria-label="Loading iRefair" aria-busy="true">
          <div className="loader-orbit">
            <div className="loader-box-wrap">
              <div className="loader-box loader-box--one" />
              <div className="loader-box loader-box--two" />
              <div className="loader-box loader-box--three" />
              <div className="loader-box loader-box--four" />
              <div className="loader-box loader-box--five" />
              <div className="loader-box loader-box--six" />
            </div>
          </div>

          <div>
            <p className="loader-title">Loading iRefair</p>
            <p className="loader-subtext">Preparing your experience...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
