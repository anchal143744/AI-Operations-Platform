import { Icon } from "../icons";
import { Card } from "../ui/primitives";

export function LeadEnquiryContext({
  context,
  demo = true,
}: {
  context: string;
  demo?: boolean;
}) {
  return (
    <Card className="lead-detail-card lead-enquiry lead-area-enquiry">
      <div className="lead-card-heading">
        <span className="lead-card-icon" aria-hidden="true">
          <Icon name="inbox" />
        </span>
        <div>
          <p className="app-kicker">
            {demo ? "Synthetic placeholder" : "Enquiry context"}
          </p>
          <h2>{demo ? "Demo enquiry context" : "Enquiry context"}</h2>
        </div>
      </div>
      {context ? (
        <blockquote>{context}</blockquote>
      ) : (
        <p>No enquiry context recorded yet.</p>
      )}
      {demo ? (
        <p className="lead-demo-disclosure">
          This text demonstrates the future information architecture. It is not
          a real customer enquiry.
        </p>
      ) : null}
    </Card>
  );
}
