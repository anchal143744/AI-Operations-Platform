import type { PasswordStrengthResult } from "../../lib/auth/validation";

export function PasswordStrength({
  strength,
}: {
  strength: PasswordStrengthResult;
}) {
  return (
    <div
      className={`password-strength strength-${strength.level}`}
      role="status"
      aria-label={`Password strength: ${strength.label}`}
    >
      <div className="password-strength-copy">
        <span>Password strength</span>
        <strong>{strength.label}</strong>
      </div>
      <span className="strength-meter" aria-hidden="true">
        {[1, 2, 3].map((segment) => (
          <span
            className={segment <= strength.score ? "is-active" : undefined}
            key={segment}
          />
        ))}
      </span>
      <small>Use 10+ characters with uppercase, lowercase, and a number.</small>
    </div>
  );
}
