import Link from "next/link";
import {
  capabilities,
  howItWorksSteps,
  outcomes,
  previewLead,
  securityPrinciples,
  trustPrinciples,
} from "../../lib/landing-data";
import { Icon } from "../icons";
import {
  Badge,
  BrandMark,
  ButtonLink,
  Card,
  Container,
  IconWrapper,
  NavItem,
  Reveal,
  Section,
  StatusIndicator,
} from "../ui/primitives";
import { MobileNavigation } from "./mobile-navigation";

const workflowStages = [
  { label: "Customer enquiry", detail: "Website · 09:42", state: "complete" },
  {
    label: "AI understanding",
    detail: "6 fields extracted",
    state: "complete",
  },
  { label: "Lead qualified", detail: "Score 87 · Hot", state: "complete" },
  { label: "Response draft", detail: "Ready for review", state: "complete" },
  { label: "Human approval", detail: "Approval required", state: "active" },
  { label: "Follow-up", detail: "After approved send", state: "pending" },
] as const;

const beforeSteps = [
  "Enquiry",
  "Manual reading",
  "Manual entry",
  "Manual assignment",
  "Manual response",
  "Manual follow-up",
] as const;

const afterSteps = [
  "Enquiry",
  "AI understands",
  "Lead created",
  "AI qualifies",
  "Human approves",
  "Automated follow-up",
] as const;

function Header() {
  return (
    <header className="site-header">
      <Container className="nav-shell">
        <a
          className="brand-link"
          href="#top"
          aria-label="AI Operations Platform home"
        >
          <BrandMark />
        </a>

        <nav className="desktop-nav" aria-label="Primary navigation">
          <NavItem href="#product">Product</NavItem>
          <NavItem href="#how-it-works">How It Works</NavItem>
          <NavItem href="#capabilities">Capabilities</NavItem>
          <NavItem href="#security">Security</NavItem>
        </nav>

        <div className="nav-actions">
          <Link className="nav-signin" href="/login">
            Sign In
          </Link>
          <ButtonLink href="/signup" size="small">
            Get Started
          </ButtonLink>
        </div>

        <MobileNavigation />
      </Container>
    </header>
  );
}

function WorkflowVisual() {
  return (
    <div className="workflow-window" aria-label="Illustrative enquiry workflow">
      <div className="window-bar">
        <div className="window-brand">
          <StatusIndicator state="active" />
          <span>Live workflow</span>
        </div>
        <Badge tone="neutral">Illustrative</Badge>
      </div>
      <div className="enquiry-card">
        <div className="avatar" aria-hidden="true">
          AM
        </div>
        <div>
          <div className="enquiry-meta">
            <strong>Ardent Manufacturing</strong>
            <span>just now</span>
          </div>
          <p>We need 200 ergonomic chairs for our Delhi office by October.</p>
        </div>
      </div>
      <ol className="workflow-list">
        {workflowStages.map((stage, index) => (
          <li
            className={"workflow-stage stage-" + stage.state}
            key={stage.label}
          >
            <div className="stage-rail" aria-hidden="true">
              <span
                className="stage-dot"
                style={{ animationDelay: String(index * 150) + "ms" }}
              />
              {index < workflowStages.length - 1 ? (
                <span className="stage-line" />
              ) : null}
            </div>
            <div className="stage-copy">
              <span>{stage.label}</span>
              <small>{stage.detail}</small>
            </div>
            {stage.state === "complete" ? (
              <Icon name="check" size="small" />
            ) : null}
            {stage.state === "active" ? (
              <Badge tone="warning">Review</Badge>
            ) : null}
          </li>
        ))}
      </ol>
      <div className="workflow-policy">
        <Icon name="shield-check" size="small" />
        <span>Policy check passed</span>
        <span className="policy-separator" aria-hidden="true" />
        <span>Human decision pending</span>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <Section id="top" tone="dark" className="hero-section">
      <Container className="hero-grid">
        <Reveal className="hero-copy">
          <Badge tone="brand">
            <StatusIndicator state="active" /> Controlled AI operations
          </Badge>
          <h1>Your business operations, intelligently automated.</h1>
          <p className="hero-lede">
            Transform incoming customer enquiries into organized, qualified,
            followed-up opportunities—with AI handling repetitive work while
            your team stays in control.
          </p>
          <div className="hero-actions">
            <ButtonLink href="/signup" variant="primary">
              Get Started <Icon name="arrow-right" size="small" />
            </ButtonLink>
            <ButtonLink href="#how-it-works" variant="secondary">
              See How It Works
            </ButtonLink>
          </div>
          <p className="hero-note">
            <Icon name="shield-check" size="small" /> Important actions remain
            policy-controlled and reviewable.
          </p>
        </Reveal>
        <Reveal className="hero-visual" delay="medium">
          <div className="visual-glow" aria-hidden="true" />
          <WorkflowVisual />
        </Reveal>
      </Container>
    </Section>
  );
}

function TrustStrip() {
  return (
    <div className="trust-strip">
      <Container className="trust-content">
        <p>Built for controlled AI automation.</p>
        <ul>
          {trustPrinciples.map((item) => (
            <li key={item.label}>
              <Icon name={item.icon} size="small" /> {item.label}
            </li>
          ))}
        </ul>
      </Container>
    </div>
  );
}

function ProblemSection() {
  const inputs = [
    "Email",
    "Website forms",
    "Spreadsheets",
    "Manual follow-ups",
    "Scattered customer data",
  ];
  const consequences = [
    "Lost enquiries",
    "Slow responses",
    "Missed follow-ups",
    "Poor visibility",
    "Repetitive work",
  ];

  return (
    <Section id="product" className="problem-section">
      <Container>
        <Reveal className="section-heading split-heading">
          <div>
            <Badge tone="neutral">The operational gap</Badge>
            <h2>Business enquiries shouldn&apos;t become manual work.</h2>
          </div>
          <p>
            Every disconnected handoff adds delay, uncertainty, and another
            opportunity for valuable context to disappear.
          </p>
        </Reveal>
        <Reveal className="fragment-map" delay="short">
          <div className="fragment-column">
            <span className="eyebrow">Fragmented inputs</span>
            {inputs.map((item, index) => (
              <div className="fragment-item" key={item}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {item}
              </div>
            ))}
          </div>
          <div className="fragment-center" aria-hidden="true">
            <span />
            <Icon name="arrow-right" />
            <span />
          </div>
          <div className="fragment-column consequences">
            <span className="eyebrow">Operational drag</span>
            {consequences.map((item) => (
              <div className="fragment-item" key={item}>
                <Icon name="alert" size="small" />
                {item}
              </div>
            ))}
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}

function Sequence({
  label,
  steps,
  positive,
}: {
  label: string;
  steps: readonly string[];
  positive?: boolean;
}) {
  return (
    <div className={"sequence" + (positive ? " sequence-positive" : "")}>
      <div className="sequence-head">
        <span>{label}</span>
        {positive ? (
          <Badge tone="success">Coordinated</Badge>
        ) : (
          <Badge tone="neutral">Fragmented</Badge>
        )}
      </div>
      <ol>
        {steps.map((step, index) => (
          <li key={step}>
            <span className="sequence-index">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="sequence-node">{step}</span>
            {index < steps.length - 1 ? (
              <span className="sequence-connector" aria-hidden="true">
                <Icon name="arrow-down" size="small" />
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

function TransformationSection() {
  return (
    <Section tone="soft" className="transformation-section">
      <Container>
        <Reveal className="section-heading centered-heading">
          <Badge tone="brand">One controlled flow</Badge>
          <h2>From scattered tasks to structured execution.</h2>
          <p>
            Replace fragile handoffs with a workflow your team can understand,
            supervise, and improve.
          </p>
        </Reveal>
        <Reveal className="transformation-grid" delay="short">
          <Sequence label="Before" steps={beforeSteps} />
          <div className="transformation-switch" aria-hidden="true">
            <Icon name="arrow-right" />
            <span>Transform</span>
          </div>
          <Sequence label="With AI Operations" steps={afterSteps} positive />
        </Reveal>
      </Container>
    </Section>
  );
}

function HowItWorksSection() {
  return (
    <Section id="how-it-works">
      <Container>
        <Reveal className="section-heading split-heading">
          <div>
            <Badge tone="neutral">How it works</Badge>
            <h2>One workflow. Five deliberate stages.</h2>
          </div>
          <p>
            AI accelerates interpretation and preparation. Rules, permissions,
            and people keep execution accountable.
          </p>
        </Reveal>
        <div className="steps-grid">
          {howItWorksSteps.map((step, index) => (
            <Reveal
              key={step.title}
              delay={index % 2 === 0 ? "short" : "medium"}
            >
              <article className="step-card">
                <div className="step-top">
                  <span>{step.number}</span>
                  <IconWrapper>
                    <Icon name={step.icon} />
                  </IconWrapper>
                </div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
                {step.note ? <small>{step.note}</small> : null}
              </article>
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  );
}

function ProductPreview() {
  return (
    <Section tone="dark" className="preview-section">
      <Container>
        <Reveal className="section-heading preview-heading">
          <div>
            <Badge tone="brand">Product preview · mock data</Badge>
            <h2>Context your team can act on.</h2>
          </div>
          <p>
            See the requirement, qualification logic, and recommended next step
            in one focused operational view.
          </p>
        </Reveal>
        <Reveal className="app-frame" delay="short">
          <aside
            className="app-sidebar"
            aria-label="Illustrative application navigation"
          >
            <BrandMark compact />
            <div className="sidebar-items" aria-hidden="true">
              <span>
                <Icon name="grid" size="small" />
              </span>
              <span className="active">
                <Icon name="users" size="small" />
              </span>
              <span>
                <Icon name="inbox" size="small" />
              </span>
              <span>
                <Icon name="workflow" size="small" />
              </span>
            </div>
          </aside>
          <div className="app-content">
            <div className="app-toolbar">
              <div>
                <span className="app-kicker">Lead / {previewLead.id}</span>
                <h3>{previewLead.company}</h3>
              </div>
              <Badge tone="success">
                <StatusIndicator state="complete" />{" "}
                {previewLead.classification}
              </Badge>
            </div>
            <div className="lead-layout">
              <div className="lead-main">
                <div className="lead-facts">
                  <div>
                    <span>Contact</span>
                    <strong>{previewLead.contact}</strong>
                  </div>
                  <div>
                    <span>Requirement</span>
                    <strong>{previewLead.requirement}</strong>
                  </div>
                  <div>
                    <span>Timeline</span>
                    <strong>{previewLead.timeline}</strong>
                  </div>
                  <div>
                    <span>Priority</span>
                    <strong>{previewLead.priority}</strong>
                  </div>
                </div>
                <Card className="analysis-card">
                  <div className="card-title">
                    <IconWrapper tone="brand">
                      <Icon name="spark" />
                    </IconWrapper>
                    <div>
                      <span>AI analysis</span>
                      <small>Based on the enquiry content</small>
                    </div>
                  </div>
                  <ul>
                    {previewLead.reasons.map((reason) => (
                      <li key={reason}>
                        <Icon name="check" size="small" />
                        {reason}
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>
              <aside className="score-panel">
                <span>Lead score</span>
                <div className="score">
                  <strong>{previewLead.score}</strong>
                  <small>/ 100</small>
                </div>
                <div
                  className="score-meter"
                  aria-label={
                    "Lead score " + String(previewLead.score) + " out of 100"
                  }
                >
                  <span style={{ width: String(previewLead.score) + "%" }} />
                </div>
                <div className="recommendation">
                  <Icon name="clock" />
                  <div>
                    <span>Recommended next action</span>
                    <strong>{previewLead.recommendedAction}</strong>
                  </div>
                </div>
                <button
                  type="button"
                  className="preview-action"
                  disabled
                  title="Illustrative control only"
                >
                  Prepare response <Icon name="arrow-right" size="small" />
                </button>
                <small className="mock-disclaimer">
                  Illustrative interface. No backend action is performed.
                </small>
              </aside>
            </div>
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}

function ControlSection() {
  const layers = [
    {
      name: "AI",
      icon: "spark" as const,
      detail: "Understands · classifies · drafts · recommends",
    },
    {
      name: "Policy engine",
      icon: "sliders" as const,
      detail: "Checks permissions · rules · risk",
    },
    {
      name: "Human",
      icon: "user-check" as const,
      detail: "Reviews and approves important actions",
    },
    {
      name: "System",
      icon: "bolt" as const,
      detail: "Executes authorized work and records outcomes",
    },
  ];

  return (
    <Section className="control-section">
      <Container className="control-grid">
        <Reveal className="control-copy">
          <Badge tone="neutral">Risk-based control</Badge>
          <h2>AI that works with your team—not without it.</h2>
          <p>
            Routine assistance can move quickly. Sensitive communication,
            pricing, and commitments pass through policy checks and the right
            human approval before execution.
          </p>
          <div className="control-rule">
            <Icon name="shield-check" />
            <span>
              <strong>Control stays proportional.</strong> Not every action
              needs approval; consequential actions do.
            </span>
          </div>
        </Reveal>
        <Reveal className="control-stack" delay="short">
          {layers.map((layer, index) => (
            <div className="control-layer" key={layer.name}>
              <span className="layer-index">
                {String(index + 1).padStart(2, "0")}
              </span>
              <IconWrapper tone={index === 0 ? "brand" : "neutral"}>
                <Icon name={layer.icon} />
              </IconWrapper>
              <div>
                <h3>{layer.name}</h3>
                <p>{layer.detail}</p>
              </div>
              {index < layers.length - 1 ? (
                <span className="layer-arrow" aria-hidden="true">
                  <Icon name="arrow-down" size="small" />
                </span>
              ) : null}
            </div>
          ))}
        </Reveal>
      </Container>
    </Section>
  );
}

function CapabilitiesSection() {
  return (
    <Section id="capabilities" tone="soft">
      <Container>
        <Reveal className="section-heading split-heading">
          <div>
            <Badge tone="neutral">V1 capabilities</Badge>
            <h2>The essential system for enquiry execution.</h2>
          </div>
          <p>
            A focused operating layer for understanding demand, coordinating
            decisions, and keeping follow-through visible.
          </p>
        </Reveal>
        <div className="capability-grid">
          {capabilities.map((item, index) => (
            <Reveal
              key={item.title}
              delay={
                index % 3 === 1 ? "short" : index % 3 === 2 ? "medium" : "none"
              }
            >
              <Card className="capability-card">
                <IconWrapper>
                  <Icon name={item.icon} />
                </IconWrapper>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </Card>
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  );
}

function OutcomesSection() {
  return (
    <Section>
      <Container>
        <Reveal className="section-heading centered-heading">
          <Badge tone="brand">Business outcomes</Badge>
          <h2>Better execution, without invented promises.</h2>
          <p>
            The value is operational: less friction, clearer ownership, and a
            more consistent response to every enquiry.
          </p>
        </Reveal>
        <div className="outcome-grid">
          {outcomes.map((item, index) => (
            <Reveal key={item.title} delay={index % 2 ? "short" : "none"}>
              <article className="outcome-item">
                <span className="outcome-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <IconWrapper tone="brand">
                  <Icon name={item.icon} />
                </IconWrapper>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  );
}

function SecuritySection() {
  return (
    <Section id="security" tone="dark" className="security-section">
      <Container className="security-layout">
        <Reveal className="security-copy">
          <Badge tone="brand">Trust by architecture</Badge>
          <h2>Control is part of the system, not an afterthought.</h2>
          <p>
            The platform is designed around isolation, permission boundaries,
            validated AI behavior, and traceable execution. Certifications are
            not claimed until independently achieved and verified.
          </p>
          <div className="security-line">
            <Icon name="lock" />
            <span>Security requirements shape every future product phase.</span>
          </div>
        </Reveal>
        <div className="security-grid">
          {securityPrinciples.map((item, index) => (
            <Reveal key={item.title} delay={index % 2 ? "short" : "none"}>
              <Card className="security-card">
                <IconWrapper tone="dark">
                  <Icon name={item.icon} />
                </IconWrapper>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </Card>
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  );
}

function FinalCta() {
  return (
    <Section id="contact" className="cta-section">
      <Container>
        <Reveal className="cta-panel">
          <div className="cta-orbit" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <Badge tone="brand">Page 01 · Product introduction</Badge>
          <h2>Turn every enquiry into an intelligent workflow.</h2>
          <p>
            Bring your team&apos;s repetitive sales operations into one
            controlled AI workflow.
          </p>
          <div className="hero-actions cta-actions">
            <ButtonLink href="/signup" variant="primary">
              Get Started <Icon name="arrow-right" size="small" />
            </ButtonLink>
            <ButtonLink href="#how-it-works" variant="outline">
              See How It Works
            </ButtonLink>
          </div>
          <small id="access-note">
            Account creation and workspace setup are available. AI and
            communication provider features are still in development.
          </small>
        </Reveal>
      </Container>
    </Section>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <Container className="footer-top">
        <div className="footer-brand">
          <BrandMark />
          <p>Controlled AI automation for B2B sales and operations.</p>
        </div>
        <nav className="footer-nav" aria-label="Footer navigation">
          <a href="#product">Product</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#security">Security</a>
          <a href="#contact">Contact</a>
          <span aria-disabled="true" title="Privacy page is planned">
            Privacy
          </span>
          <span aria-disabled="true" title="Terms page is planned">
            Terms
          </span>
        </nav>
      </Container>
      <Container className="footer-bottom">
        <span>© 2026 AI Operations Platform</span>
        <span>Foundation preview · No backend connection</span>
      </Container>
    </footer>
  );
}

export function LandingPage() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <Header />
      <main id="main-content">
        <Hero />
        <TrustStrip />
        <ProblemSection />
        <TransformationSection />
        <HowItWorksSection />
        <ProductPreview />
        <ControlSection />
        <CapabilitiesSection />
        <OutcomesSection />
        <SecuritySection />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
