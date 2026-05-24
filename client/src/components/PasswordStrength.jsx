const rules = [
  { label: "8+ characters", test: (p) => p.length >= 8 },
  { label: "Upper & lower case", test: (p) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { label: "Number", test: (p) => /\d/.test(p) },
  { label: "Special character", test: (p) => /[^a-zA-Z0-9]/.test(p) },
];

export function PasswordStrength({ password }) {
  const score = rules.filter((r) => r.test(password || "")).length;
  const pct = (score / rules.length) * 100;

  const label =
    score <= 1 ? "Weak" : score <= 2 ? "Fair" : score <= 3 ? "Good" : "Strong";

  return (
    <div className="space-y-2">
      <div className="flex h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div
          className="bg-brand-600 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-400">
        Strength: <span className="font-medium text-slate-900 dark:text-slate-100">{label}</span>
      </p>
      <ul className="grid gap-1 text-xs text-slate-500 dark:text-slate-400 sm:grid-cols-2">
        {rules.map((r) => {
          const ok = r.test(password || "");
          return (
            <li key={r.label} className={ok ? "text-emerald-600 dark:text-emerald-400" : ""}>
              {ok ? "✓ " : "○ "}
              {r.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
