import { ApprovalRuntimePanel } from "../workflow-control/approval-runtime-panel";
import { ApprovalControlModel } from "./approval-control-model";
import { ApprovalHeader } from "./approval-header";
import { ApprovalPolicyPanel } from "./approval-policy-panel";
import { ApprovalTrust } from "./approval-trust";

export function ApprovalPage() {
  return (
    <div className="operations-page approval-page">
      <ApprovalHeader />
      <ApprovalRuntimePanel />
      <div className="approval-control-grid" id="approval-policy-preview">
        <ApprovalPolicyPanel />
      </div>
      <ApprovalControlModel />
      <ApprovalTrust />
    </div>
  );
}
