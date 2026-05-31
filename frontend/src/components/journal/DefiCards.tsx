import { DEFI_SUMMARY } from "./journalData";

type DefiCardProps = {
  label: string;
  color: "green" | "orange" | "red";
};

function DefiCard(p: DefiCardProps) {
  const colors = {
    green:  { dot: "#22C55E", text: "text-green",  border: "border-green/30",  bg: "bg-green/[0.05]" },
    orange: { dot: "#F97316", text: "text-orange", border: "border-orange/30", bg: "bg-orange/[0.05]" },
    red:    { dot: "#EF4444", text: "text-red",    border: "border-red/30",    bg: "bg-red/[0.05]" },
  }[p.color];

  return (
    <div className={`${colors.bg} border ${colors.border} rounded-lg p-4`}>
      <div className={`text-sm font-medium ${colors.text} mb-3 flex items-center gap-2`}>
        <span className="w-2 h-2 rounded-full inline-block" style={{ background: colors.dot }} />
        {p.label}
      </div>
      <div className="text-xs text-muted italic mb-3">En attente de données</div>
      <div className="grid grid-cols-2 gap-1.5 text-xs">
        <div><div className="text-muted">Balance</div><div className="text-text font-medium">—</div></div>
        <div><div className="text-muted">PnL net</div><div className="text-text font-medium">—</div></div>
        <div><div className="text-muted">Trades</div><div className="text-text font-medium">—</div></div>
        <div><div className="text-muted">Win rate</div><div className="text-text font-medium">—</div></div>
      </div>
    </div>
  );
}

export default function DefiCards() {
  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <DefiCard label={DEFI_SUMMARY.paper.label}       color="green" />
      <DefiCard label={DEFI_SUMMARY.propfirm.label}    color="orange" />
      <DefiCard label={DEFI_SUMMARY.challengeZ.label}  color="red" />
    </div>
  );
}
