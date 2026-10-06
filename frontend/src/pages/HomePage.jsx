import { Link } from 'react-router-dom'
import './HomePage.css'

const marqueeWords = [
  'Courses',
  'Assessments',
  'Certificates',
  'Trainer Verification',
  'Competency Mapping',
  'Progress Tracking',
]

const features = [
  {
    title: 'Progressive Courses',
    text: 'Move through Beginner, Intermediate and Advanced levels, each with its own resources and assessment.',
  },
  {
    title: 'Assessments',
    text: 'Test what you have learned with timed assessments and clear results at every level.',
  },
  {
    title: 'One Final Certificate',
    text: 'Finish all three levels of a course and earn a single certificate for it.',
  },
  {
    title: 'Verified Trainers',
    text: 'Trainers submit qualifications, experience and documents, and are reviewed by an admin before they teach.',
  },
  {
    title: 'Competency Profiles',
    text: 'Skills evidence from tests, recommendations and feedback is brought together in one profile.',
  },
  {
    title: 'Notifications',
    text: 'Stay up to date on deadlines, approvals, reviews and certificates.',
  },
]

const roles = [
  {
    key: 'trainee',
    label: 'Trainee',
    title: 'Learn and get certified',
    text: 'Pick a course, work through the levels and earn your certificate.',
    points: ['Browse and enroll in courses', 'Take level assessments', 'Track your progress'],
    canSignup: true,
  },
  {
    key: 'trainer',
    label: 'Trainer',
    title: 'Qualify and teach',
    text: 'Build a verified professional profile and manage your courses.',
    points: ['Add qualifications and experience', 'Upload verification documents', 'Create courses and assessments'],
    canSignup: true,
    note: 'Trainer accounts need admin approval before you can log in.',
  },
  {
    key: 'admin',
    label: 'Admin',
    title: 'Verify and govern',
    text: 'Review trainers, documents and competency across the platform.',
    points: ['Approve trainers', 'Verify documents', 'Monitor competency gaps'],
    canSignup: false,
    note: 'Admin accounts are created by the platform, not through signup.',
  },
]

function MarqueeRow() {
  return (
    <div className="home-marquee-item">
      {marqueeWords.map((word) => (
        <span key={word} style={{ display: 'contents' }}>
          <span>{word}</span>
          <i>✦</i>
        </span>
      ))}
    </div>
  )
}

function HomePage() {
  return (
    <div className="home">
      {/* ================= NAVBAR ================= */}
      <nav className="home-nav">
        <Link to="/" className="home-brand">
          <span className="home-brand-mark home-display">C</span>
          <span className="home-brand-name home-display">Capacity Connect</span>
        </Link>

        <div className="home-nav-links">
          <a href="#features">Features</a>
          <a href="#roles">Who it is for</a>
        </div>

        <div className="home-nav-actions">
          <Link to="/login/trainee" className="home-btn home-btn-ghost">
            Log in
          </Link>
          <Link to="/signup/trainee" className="home-btn home-btn-primary">
            Get started
          </Link>
        </div>
      </nav>

      {/* ================= HERO ================= */}
      <header className="home-hero">
        <div className="home-hero-inner">
          <div>
            <span className="home-eyebrow home-mono home-rise home-rise-1">
              <span className="home-eyebrow-dot" />
              Learning and competency portal
            </span>

            <h1 className="home-rise home-rise-2">
              Build skills.
              <br />
              Prove <span className="accent">competence.</span>
            </h1>

            <p className="home-hero-sub home-rise home-rise-3">
              Capacity Connect brings courses, assessments, certificates and
              trainer verification into one place, for trainees, trainers and
              administrators.
            </p>

            <div className="home-hero-cta home-rise home-rise-4">
              <Link to="/signup/trainee" className="home-btn home-btn-primary home-btn-lg">
                Start learning
              </Link>
              <Link to="/login/trainer" className="home-btn home-btn-ghost home-btn-lg">
                I am a trainer
              </Link>
            </div>
          </div>

          {/* How it works */}
          <div className="home-preview home-rise home-rise-3">
            <div className="home-preview-tag home-mono">
              <span>How it works</span>
              <span>Three steps</span>
            </div>

            <h3>From enrollment to certificate</h3>
            <p className="home-preview-meta">
              Every course follows the same path.
            </p>

            <div className="home-level">
              <span className="home-level-icon">1</span>
              Enroll in a course
            </div>
            <div className="home-level">
              <span className="home-level-icon">2</span>
              Complete Beginner, Intermediate and Advanced
            </div>
            <div className="home-level active">
              <span className="home-level-icon">3</span>
              Earn one final certificate
            </div>

            <p className="home-preview-foot">
              Trainers are verified by an admin before they can teach.
            </p>
          </div>
        </div>
      </header>

      {/* ================= MARQUEE ================= */}
      <div className="home-marquee" aria-hidden="true">
        <div className="home-marquee-track">
          <MarqueeRow />
          <MarqueeRow />
        </div>
      </div>

      {/* ================= FEATURES ================= */}
      <section className="home-section" id="features">
        <div className="home-section-inner">
          <span className="home-kicker home-mono">What you get</span>
          <h2>Everything in one connected platform</h2>
          <p className="home-section-sub">
            Learning on one side, trainer quality on the other, and an admin
            keeping both honest.
          </p>

          <div className="home-features">
            {features.map((feature, index) => (
              <article className="home-feature" key={feature.title}>
                <span className="home-feature-num home-mono">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ================= ROLES ================= */}
      <section className="home-section home-roles-section" id="roles">
        <div className="home-section-inner">
          <span className="home-kicker home-mono">Who it is for</span>
          <h2>Choose your role</h2>
          <p className="home-section-sub">
            Each role has its own dashboard and tools.
          </p>

          <div className="home-roles">
            {roles.map((role) => (
              <article className="home-role" key={role.key}>
                <span className="home-role-label home-mono">{role.label}</span>
                <h3>{role.title}</h3>
                <p>{role.text}</p>

                <ul>
                  {role.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>

                <div className="home-role-actions">
                  <Link to={`/login/${role.key}`} className="home-btn home-btn-primary">
                    Log in
                  </Link>
                  {role.canSignup && (
                    <Link to={`/signup/${role.key}`} className="home-btn home-btn-ghost">
                      Sign up
                    </Link>
                  )}
                </div>

                {role.note && <p className="home-role-note">{role.note}</p>}
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="home-footer home-mono">
        <span>Capacity Connect - Learning and Capacity Building Portal</span>
        <span>Trainee · Trainer · Admin</span>
      </footer>
    </div>
  )
}

export default HomePage