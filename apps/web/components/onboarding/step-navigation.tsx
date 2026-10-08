import { Icon } from "../icons";
import { Button } from "../ui/primitives";

export function StepNavigation({
  onBack,
  nextLabel = "Continue",
  isBusy = false,
}: {
  onBack?: () => void;
  nextLabel?: string;
  isBusy?: boolean;
}) {
  return (
    <div className="step-navigation">
      {onBack ? (
        <Button
          className="step-back"
          type="button"
          variant="outline"
          disabled={isBusy}
          onClick={onBack}
        >
          <Icon name="arrow-right" size="small" /> Back
        </Button>
      ) : (
        <span />
      )}
      <Button className="step-next" type="submit" disabled={isBusy}>
        {isBusy ? (
          <>
            <span className="button-spinner" aria-hidden="true" /> Preparing…
          </>
        ) : (
          <>
            {nextLabel} <Icon name="arrow-right" size="small" />
          </>
        )}
      </Button>
    </div>
  );
}
