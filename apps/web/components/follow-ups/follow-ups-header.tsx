import { Icon } from "../icons";
import { Button } from "../ui/primitives";

export function FollowUpsHeader({ onCreate }: { onCreate: () => void }) {
  return (
    <header className="follow-ups-header">
      <div>
        <p className="app-kicker">Operational next actions</p>
        <h1>Follow-ups</h1>
        <p>Keep customer opportunities moving with timely next actions.</p>
      </div>
      <Button onClick={onCreate}>
        <Icon name="repeat" size="small" />
        Create follow-up
      </Button>
    </header>
  );
}
