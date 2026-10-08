import { Card } from "../ui/primitives";

export function ApprovalDetails() {
  return (
    <section
      className="approval-detail-stack"
      aria-labelledby="approval-detail-title"
    >
      <div className="approval-detail-heading">
        <p className="app-kicker">Request detail</p>
        <h2 id="approval-detail-title">Understand before deciding</h2>
        <p>
          Select a review request to inspect exactly what is proposed and why.
        </p>
      </div>

      <Card className="approval-detail-card approval-request-card">
        <span className="approval-detail-index">01</span>
        <div>
          <h3>Request</h3>
          <p>No approval request is selected.</p>
        </div>
      </Card>
      <AIRecommendationState />
      <ProposedActionState />
    </section>
  );
}

export function AIRecommendationState() {
  return (
    <Card className="approval-detail-card">
      <span className="approval-detail-index">02</span>
      <div>
        <h3>AI Recommendation</h3>
        <strong>No AI recommendation is available.</strong>
        <p>
          AI-generated recommendations will appear here when the AI operations
          engine is connected.
        </p>
      </div>
    </Card>
  );
}

export function ProposedActionState() {
  return (
    <Card className="approval-detail-card">
      <span className="approval-detail-index">03</span>
      <div>
        <h3>Proposed Action</h3>
        <strong>No action has been proposed.</strong>
        <p>
          Proposed customer, lead, follow-up, or workflow changes will be shown
          here for review.
        </p>
      </div>
    </Card>
  );
}
