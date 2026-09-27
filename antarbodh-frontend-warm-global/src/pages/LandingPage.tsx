import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Crosshair,
  Droplets,
  Layers,
  MoveVertical,
  Navigation,
  Plus,
  Satellite,
  Thermometer,
  Wind,
} from 'lucide-react';

import { AntarbodhMark } from '../components/branding/AntarbodhMark';
import { BayMedallion } from '../components/landing/BayMedallion';
import { DepthGauge } from '../components/landing/DepthGauge';
import { LandingNav } from '../components/landing/LandingNav';
import { RevealText } from '../components/landing/RevealText';
import { StatCounter } from '../components/landing/StatCounter';

import '../styles/landing.css';

const SURFACE_INPUTS: { label: string; icon: ReactNode }[] = [
  { label: 'Sea surface temperature', icon: <Thermometer size={15} /> },
  { label: 'Sea surface salinity', icon: <Droplets size={15} /> },
  { label: 'Sea surface height', icon: <MoveVertical size={15} /> },
  { label: 'Surface currents', icon: <Navigation size={15} /> },
  { label: 'Surface winds', icon: <Wind size={15} /> },
];

const STEPS = [
  {
    icon: <Satellite size={20} />,
    title: 'Observe the surface',
    body:
      'Seven surface fields for the chosen day (temperature, salinity, height, two current components and two wind components) are quality-checked and placed on a common 0.25° grid.',
  },
  {
    icon: <Layers size={20} />,
    title: 'Reconstruct the column',
    body:
      'A convolutional neural network reads those fields together and returns temperature at 15 standard depths, from the surface down to 1,000 m.',
  },
  {
    icon: <Crosshair size={20} />,
    title: 'Check against the sea',
    body:
      'Reconstructions are scored against independent Argo float profiles, with the GLORYS reanalysis as a reference: error, bias and correlation at every depth.',
  },
];

const TOOLS = [
  {
    to: '/explore',
    title: 'Explore',
    hindi: 'अन्वेषण',
    body: 'Move through every day of 2025 on a map and read the temperature at any of the 15 depths.',
  },
  {
    to: '/predict',
    title: 'Predict',
    hindi: 'पूर्वानुमान',
    body: 'Choose a date and a point in the Bay. Get a full temperature profile, surface to 1,000 m.',
  },
  {
    to: '/validate',
    title: 'Validate',
    hindi: 'सत्यापन',
    body: 'See how reconstructions compare with Argo float measurements, depth by depth.',
  },
  {
    to: '/methodology',
    title: 'Methodology',
    hindi: 'पद्धति',
    body: 'The data sources, preprocessing and model design behind every number.',
  },
];

const QUESTIONS = [
  {
    q: 'What does Antarbodh produce?',
    a: 'Sea temperature at 15 standard depths (0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 300, 500, 700 and 1,000 m) on a daily 0.25° grid.',
  },
  {
    q: 'What goes into the model?',
    a: 'Only surface observations: sea surface temperature, salinity and height, surface currents and surface winds. No reanalysis or in-situ data is used when a reconstruction is made. If an input is missing for a day, the model uses a representation of missingness it learned in training rather than substituting another dataset.',
  },
  {
    q: 'How do you know the reconstructions are right?',
    a: 'GLORYS reanalysis is the training target, so matching it alone would prove little. The main test is against Argo floats, which measure real temperature profiles and were never shown to the model. The Validate page reports RMSE, MAE, bias and correlation at each depth.',
  },
  {
    q: 'Which area and dates are covered?',
    a: 'The prototype covers the Bay of Bengal from 5°N to 20°N and 80°E to 100°E, for every day from 1 January to 31 December 2025.',
  },
  {
    q: 'Is this an operational forecast?',
    a: 'No. It is a research prototype built for the Smart India Hackathon to test whether surface observations carry enough information to recover the temperature below them.',
  },
  {
    q: 'What does the name mean?',
    a: 'अंतर्बोध (antarbodh) is Hindi for inner understanding: knowing what lies within. Here, it is the ocean beneath the surface.',
  },
];

export function LandingPage() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.title = 'Antarbodh | See beneath the Bay of Bengal';

    return () => {
      document.title = 'ANTARBODH — Subsurface Ocean Intelligence';
    };
  }, []);

  return (
    <div className="landing" id="top">
      <a className="l-skip" href="#main">
        Skip to content
      </a>

      <LandingNav />
      <DepthGauge />

      <main id="main">
        {/* ============================================ SURFACE */}
        <section className="l-hero" data-tone="light" data-depth="0">
          <div className="l-wrap">
            <p className="l-pill">
              <span className="l-pill__dot" aria-hidden="true" />
              Smart India Hackathon prototype for the Bay of Bengal
            </p>

            <div className="l-hero__grid">
              <h1 className="l-hero__title">
                Understand the ocean beneath the surface.
              </h1>

              <div>
                <p className="l-hero__lede">
                  Antarbodh reconstructs sea temperature at 15 depths, down
                  to 1,000 metres, using only what satellites measure at the
                  surface. Pick any day of 2025 and any point in the Bay of
                  Bengal.
                </p>

                <div className="l-hero__actions">
                  <Link to="/explore" className="l-btn l-btn--kesar l-btn--lg">
                    Explore the 2025 dataset
                  </Link>
                  <Link to="/predict" className="l-btn l-btn--ghost l-btn--lg">
                    Reconstruct a profile
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="l-surface">
            <div className="l-surface__labels l-wrap">
              <span>0 m, sea surface</span>
              <span lang="en">
                <span lang="hi">अंतर्बोध</span> is Hindi for inner
                understanding
              </span>
            </div>

            <div className="l-wordmark" aria-hidden="true">
              <span className="l-wordmark__word" lang="hi">
                अंतर्बोध
              </span>
            </div>
          </div>

          <div className="l-inputs">
            <p className="l-inputs__title l-wrap">
              What satellites see at the surface
            </p>

            <div className="l-marquee">
              <ul className="l-marquee__track">
                {[0, 1].map((copy) =>
                  SURFACE_INPUTS.map(({ label, icon }) => (
                    <li
                      key={`${copy}-${label}`}
                      className="l-chip"
                      aria-hidden={copy === 1 || undefined}
                    >
                      <span className="l-chip__icon">{icon}</span>
                      {label}
                    </li>
                  )),
                )}
              </ul>
            </div>
          </div>
        </section>

        {/* ============================================ UPPER OCEAN */}
        <section
          className="l-stats"
          data-tone="light"
          data-depth="10"
          aria-label="Antarbodh in numbers"
        >
          <div className="l-wrap l-stats__grid">
            <StatCounter value={15} label="standard depths in every profile" />
            <StatCounter value={1000} unit=" m" label="the deepest level reconstructed" />
            <StatCounter value={0.25} decimals={2} unit="°" label="grid spacing, roughly 28 km" />
            <StatCounter value={365} label="days of 2025 ready to explore" />
          </div>
        </section>

        <section className="l-statement" data-tone="light" data-depth="30">
          <div className="l-wrap">
            <RevealText text="Satellites watch only the skin of the sea. Cyclone strength, monsoon rain and fish stocks all depend on the water beneath it. Antarbodh learns that hidden layer from the surface alone." />
          </div>
        </section>

        <div className="l-thermocline" data-tone="light" data-depth="50" role="presentation">
          <p className="l-thermocline__note">
            <strong>Thermocline.</strong> Between about 50 and 200 m,
            temperature falls faster than anywhere else in the column.
          </p>
        </div>

        {/* ============================================ THE DEEP */}
        <div className="l-deep" data-tone="dark">
          <section id="how" className="l-section" data-depth="200">
            <div className="l-wrap">
              <header className="l-heading">
                <p className="l-heading__hindi" lang="hi">
                  कार्यप्रणाली
                </p>
                <h2>How a reconstruction is made</h2>
              </header>

              <ol className="l-steps">
                {STEPS.map(({ icon, title, body }, index) => (
                  <li key={title} className="l-step">
                    <div className="l-step__top">
                      <span className="l-step__icon">{icon}</span>
                      <span className="l-step__number">{index + 1}</span>
                    </div>
                    <h3>{title}</h3>
                    <p>{body}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section id="bay" className="l-section l-bay" data-depth="300">
            <div className="l-wrap l-bay__grid">
              <div className="l-bay__map">
                <BayMedallion />
              </div>

              <div className="l-bay__copy">
                <header className="l-heading">
                  <p className="l-heading__hindi" lang="hi">
                    बंगाल की खाड़ी
                  </p>
                  <h2>Built for the Bay of Bengal</h2>
                </header>

                <p className="l-body">
                  The prototype covers the waters off India&rsquo;s east
                  coast, Sri Lanka, Bangladesh and Myanmar, out to the
                  Andaman Sea. Each dot on the map is a grid cell where
                  Antarbodh reconstructs a full temperature profile.
                </p>

                <dl className="l-facts">
                  <div>
                    <dt>Latitude</dt>
                    <dd>5°N to 20°N</dd>
                  </div>
                  <div>
                    <dt>Longitude</dt>
                    <dd>80°E to 100°E</dd>
                  </div>
                  <div>
                    <dt>Grid</dt>
                    <dd>0.25°, daily</dd>
                  </div>
                  <div>
                    <dt>Period</dt>
                    <dd>1 Jan to 31 Dec 2025</dd>
                  </div>
                </dl>
              </div>
            </div>
          </section>

          <section id="tools" className="l-section" data-depth="500">
            <div className="l-wrap">
              <header className="l-heading">
                <p className="l-heading__hindi" lang="hi">
                  उपकरण
                </p>
                <h2>Four ways into the data</h2>
              </header>

              <ul className="l-tools">
                {TOOLS.map(({ to, title, hindi, body }) => (
                  <li key={to}>
                    <Link to={to} className="l-tool">
                      <span className="l-tool__name">
                        <span className="l-tool__title">{title}</span>
                        <span className="l-tool__hindi" lang="hi">
                          {hindi}
                        </span>
                      </span>
                      <span className="l-tool__body">{body}</span>
                      <span className="l-tool__arrow" aria-hidden="true">
                        <ArrowUpRight size={22} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section id="faq" className="l-section l-faq" data-depth="700">
            <div className="l-wrap l-faq__grid">
              <header className="l-heading">
                <p className="l-heading__hindi" lang="hi">
                  सामान्य प्रश्न
                </p>
                <h2>Questions, answered</h2>
                <p className="l-body l-faq__aside">
                  The Methodology page goes deeper into data sources,
                  preprocessing and the model itself.
                </p>
              </header>

              <div className="l-faq__list">
                {QUESTIONS.map(({ q, a }) => (
                  <details key={q} className="l-faq__item">
                    <summary>
                      <span>{q}</span>
                      <Plus size={20} className="l-faq__icon" aria-hidden="true" />
                    </summary>
                    <p>{a}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>

          {/* ========================================== 1,000 m */}
          <footer className="l-footer" data-depth="1000">
            <div className="l-wrap">
              <div className="l-footer__card">
                <div className="l-footer__cta">
                  <p className="l-footer__depth">1,000 m</p>
                  <p className="l-footer__line">
                    The deepest level Antarbodh reconstructs. Start
                    anywhere above it.
                  </p>
                  <Link to="/explore" className="l-btn l-btn--kesar l-btn--lg">
                    Open the explorer
                  </Link>
                </div>

                <div className="l-footer__cols">
                  <div className="l-footer__brand">
                    <span className="l-footer__mark">
                      <AntarbodhMark size={28} />
                      <span>Antarbodh</span>
                      <span lang="hi">अंतर्बोध</span>
                    </span>
                    <p>
                      Subsurface ocean temperature for the Bay of Bengal,
                      reconstructed from surface observations.
                    </p>
                  </div>

                  <nav aria-label="Tools">
                    <h3>Tools</h3>
                    <ul>
                      {TOOLS.map(({ to, title }) => (
                        <li key={to}>
                          <Link to={to}>{title}</Link>
                        </li>
                      ))}
                    </ul>
                  </nav>

                  <div>
                    <h3>Data</h3>
                    <ul>
                      <li>Copernicus Marine GLORYS12V1</li>
                      <li>Argo floats (INCOIS)</li>
                      <li>Satellite surface fields</li>
                    </ul>
                  </div>

                  <div>
                    <h3>Project</h3>
                    <ul>
                      <li>Smart India Hackathon</li>
                      <li>Research prototype, v1</li>
                    </ul>
                  </div>
                </div>

                <div className="l-footer__tiranga" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}
