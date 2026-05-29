import { DEFI_SUMMARY } from "./journalData";

type DefiCardProps = {
  label: string;
  color: "green" | "orange" | "red";
  active: boolean;
  balance?: number;
  pnl?: number;
  trades?: number;
  wins?: number;
  losses?: number;
  be?: number;
  skips?: number;
  signaux?: number;
  winRate?: number | null;
  streak?: string;
  maxDD?: number;
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

      {!p.active ? (
        <>
          <div className="text-xs text-muted italic mb-3">En attente de données</div>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <div><div className="text-muted">Balance</div><div className="text-text font-medium">—</div></div>
            <div><div className="text-muted">PnL net</div><div className="text-text font-medium">—</div></div>
            <div><div className="text-muted">Trades</div><div className="text-text font-medium">—</div></div>
            <div><div className="text-muted">Win rate</div><div className="text-text font-medium">—</div></div>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <div><div className="text-muted">Balance</div><div className="text-text font-medium">{p.balance?.toLocaleString("fr-CA")} $</div></div>
            <div><div className="text-muted">PnL net</div><div className="text-text font-medium">{p.pnl === 0 ? "0,00 $" : `${(p.pnl ?? 0) >= 0 ? "+" : ""}${(p.pnl ?? 0).toFixed(2)} $`}</div></div>
            <div><div className="text-muted">Trades</div><div className="text-text font-medium">{p.trades}</div></div>
            <div><div className="text-muted">Win rate</div><div className="text-text font-medium">{p.winRate === null ? "n/a" : `${p.winRate?.toFixed(1)} %`}</div></div>
            <div><div className="text-muted">Streak</div><div className="text-text font-medium">{p.streak ?? "—"}</div></div>
            <div><div className="text-muted">Max DD</div><div className="text-text font-medium">{(p.maxDD ?? 0).toFixed(2)} %</div></div>
          </div>
          <div className={`text-[10px] text-muted mt-3 pt-2 border-t ${colors.border}`}>
            {p.signaux} signaux · {p.skips} skips · {p.wins}W / {p.losses}L / {p.be}BE
          </div>
        </>
      )}
    </div>
  );
}

export default function DefiCards() {
  const paper = DEFI_SUMMARY.paper;

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <DefiCard
        label={paper.label}
        color="green"
        active={paper.active}
        balance={paper.balance}
        pnl={paper.pnl}
        trades={paper.trades}
        wins={paper.wins}
        losses={paper.losses}
        be={paper.be}
        skips={paper.skips}
        signaux={paper.signaux}
        winRate={paper.winRate}
        streak={paper.streak}
        maxDD={paper.maxDD}
      />
      <DefiCard label={DEFI_SUMMARY.propfirm.label} color="orange" active={false} />
      <DefiCard label={DEFI_SUMMARY.challengeZ.label} color="red" active={false} />
    </div>
  );
}
