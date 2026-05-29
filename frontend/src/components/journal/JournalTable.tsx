"use client";
import { useState, useMemo } from "react";
import { ChevronDown, Inbox } from "lucide-react";
import { JOURNAL_ENTRIES, JournalEntry } from "./journalData";

const STATUT_STYLES: Record<string, string> = {
  W:    "bg-green/20 text-green",
  L:    "bg-red/20 text-red",
  BE:   "bg-blue/20 text-blue",
  OPEN: "bg-orange/20 text-orange",
};

const TRADES: JournalEntry[] = JOURNAL_ENTRIES.filter((e) => e.statut !== "SKIP");

const COLS = [
  { key: "date",      label: "Entrée",     align: "left",  tip: "Date d'enclenchement du trade" },
  { key: "exitDate",  label: "Sortie",     align: "left",  tip: "Date de clôture du trade" },
  { key: "strategie", label: "Stratégie",  align: "left",  tip: "Nom de la stratégie" },
  { key: "defi",      label: "Défi",       align: "left",  tip: "Paper · PropFirm · Challenge Z" },
  { key: "asset",     label: "Asset",      align: "left",  tip: "Instrument tradé" },
  { key: "timeframe", label: "TF",         align: "left",  tip: "Timeframe" },
  { key: "direction", label: "Dir",        align: "left",  tip: "Long · Short" },
  { key: "capital",   label: "Capital",    align: "right", tip: "Capital de référence" },
  { key: "risk",      label: "Risk",       align: "right", tip: "Montant max à perdre ($)" },
  { key: "entry",     label: "Entry",      align: "right", tip: "Prix d'entrée réel" },
  { key: "stop",      label: "Stop",       align: "right", tip: "Prix du stop-loss" },
  { key: "exit",      label: "Exit",       align: "right", tip: "Prix de sortie" },
  { key: "statut",    label: "Statut",     align: "left",  tip: "W · L · BE · OPEN" },
  { key: "pnl",       label: "Gain/Perte", align: "right", tip: "PnL réel du trade ($)" },
  { key: "r",         label: "R",          align: "right", tip: "R-multiple = PnL ÷ risk. +1R = gain égal au risque" },
  { key: "balance",   label: "Balance",    align: "right", tip: "Balance après le trade" },
];

export default function JournalTable() {
  const allStrategies = useMemo(
    () => Array.from(new Set(TRADES.map((e) => e.strategie))),
    []
  );
  const allStatuts = ["W", "L", "BE", "OPEN"];

  const [filterStrategie, setFilterStrategie] = useState<string>("Toutes");
  const [filterStatut, setFilterStatut] = useState<string>("Tous");

  const filtered = TRADES.filter((e) => {
    if (filterStrategie !== "Toutes" && e.strategie !== filterStrategie) return false;
    if (filterStatut !== "Tous" && e.statut !== filterStatut) return false;
    return true;
  });

  const skipsCount = JOURNAL_ENTRIES.length - TRADES.length;

  // ─── Totaux (basés sur les lignes filtrées) ───
  const totals = filtered.reduce(
    (acc, e) => {
      acc.pnl += e.pnl;
      if (e.statut === "W") acc.wins += 1;
      else if (e.statut === "L") acc.losses += 1;
      else if (e.statut === "BE") acc.be += 1;
      else if (e.statut === "OPEN") acc.open += 1;
      return acc;
    },
    { pnl: 0, wins: 0, losses: 0, be: 0, open: 0 }
  );
  const finalBalance =
    filtered.length > 0
      ? filtered[filtered.length - 1].balance
      : JOURNAL_ENTRIES[JOURNAL_ENTRIES.length - 1]?.balance ?? 10000;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] text-muted">
          {TRADES.length === 0
            ? `Aucun trade pris pour le moment · ${skipsCount} jours de SKIP comptés dans le résumé`
            : `${TRADES.length} trade${TRADES.length > 1 ? "s" : ""} enregistré${TRADES.length > 1 ? "s" : ""} · ${skipsCount} SKIP${skipsCount > 1 ? "s" : ""} non affichés`}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted uppercase tracking-wider mr-1">Filtrer :</span>
          <div className="relative">
            <select
              value={filterStrategie}
              onChange={(e) => setFilterStrategie(e.target.value)}
              disabled={TRADES.length === 0}
              className="appearance-none bg-surface border border-border rounded text-xs text-text pl-3 pr-8 py-1.5 hover:border-blue/50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="Toutes">Stratégie : Toutes</option>
              {allStrategies.map((s) => (
                <option key={s} value={s}>Stratégie : {s}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={filterStatut}
              onChange={(e) => setFilterStatut(e.target.value)}
              disabled={TRADES.length === 0}
              className="appearance-none bg-surface border border-border rounded text-xs text-text pl-3 pr-8 py-1.5 hover:border-blue/50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="Tous">Statut : Tous</option>
              {allStatuts.map((s) => (
                <option key={s} value={s}>Statut : {s}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-ink">
              <tr className="text-[10px] text-muted uppercase tracking-wider">
                {COLS.map((c) => (
                  <th
                    key={c.key}
                    title={c.tip}
                    className={`px-2 py-2.5 font-medium ${c.align === "right" ? "text-right" : "text-left"}`}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={COLS.length} className="px-3 py-10 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Inbox size={28} strokeWidth={1} className="text-border" aria-hidden="true" />
                      <div className="text-sm text-text">Aucun trade pris jusqu'à présent</div>
                      <div className="text-xs text-muted max-w-md leading-relaxed">
                        Une ligne sera créée automatiquement quand un signal LONG s'enclenche.<br />
                        Les colonnes <span className="text-text">Exit · Gain/Perte · R · Balance</span> se rempliront à la fermeture du trade.
                      </div>
                      <div className="text-[10px] text-muted mt-1">
                        {skipsCount} jour{skipsCount > 1 ? "s" : ""} de SKIP enregistré{skipsCount > 1 ? "s" : ""} dans le journal de discipline
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((e, i) => (
                  <tr key={i} className="border-t border-border text-text2">
                    <td className="px-2 py-2 whitespace-nowrap">{e.date}</td>
                    <td className="px-2 py-2 whitespace-nowrap text-muted">{e.exitDate ?? "—"}</td>
                    <td className="px-2 py-2 whitespace-nowrap">{e.strategie}</td>
                    <td className="px-2 py-2 whitespace-nowrap">{e.defi}</td>
                    <td className="px-2 py-2">{e.asset}</td>
                    <td className="px-2 py-2">{e.timeframe}</td>
                    <td className="px-2 py-2">{e.direction}</td>
                    <td className="px-2 py-2 text-right whitespace-nowrap">{e.capital.toLocaleString("fr-CA")} $</td>
                    <td className="px-2 py-2 text-right whitespace-nowrap">{e.riskDollar} $</td>
                    <td className="px-2 py-2 text-right">{e.entry ?? "—"}</td>
                    <td className="px-2 py-2 text-right">{e.stop ?? "—"}</td>
                    <td className="px-2 py-2 text-right">{e.exit ?? "—"}</td>
                    <td className="px-2 py-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${STATUT_STYLES[e.statut]}`}>
                        {e.statut}
                      </span>
                    </td>
                    <td className={`px-2 py-2 text-right whitespace-nowrap ${e.pnl > 0 ? "text-green" : e.pnl < 0 ? "text-red" : ""}`}>
                      {e.pnl === 0 ? "—" : `${e.pnl > 0 ? "+" : ""}${e.pnl.toFixed(2)} $`}
                    </td>
                    <td className="px-2 py-2 text-right">{e.rMultiple === null ? "—" : `${e.rMultiple >= 0 ? "+" : ""}${e.rMultiple.toFixed(2)}R`}</td>
                    <td className="px-2 py-2 text-right whitespace-nowrap text-text font-medium">
                      {e.balance.toLocaleString("fr-CA")} $
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot className="bg-ink border-t-2 border-border">
                <tr className="text-[11px] text-text font-medium">
                  <td className="px-2 py-2.5 text-left uppercase tracking-wider text-muted text-[10px]" colSpan={6}>
                    Total ({filtered.length} trade{filtered.length > 1 ? "s" : ""} · {totals.wins}W / {totals.losses}L / {totals.be}BE{totals.open > 0 ? ` · ${totals.open} ouvert${totals.open > 1 ? "s" : ""}` : ""})
                  </td>
                  <td className="px-2 py-2.5"></td>
                  <td className="px-2 py-2.5"></td>
                  <td className="px-2 py-2.5"></td>
                  <td className="px-2 py-2.5"></td>
                  <td className="px-2 py-2.5"></td>
                  <td className="px-2 py-2.5"></td>
                  <td className={`px-2 py-2.5 text-right whitespace-nowrap ${totals.pnl > 0 ? "text-green" : totals.pnl < 0 ? "text-red" : ""}`}>
                    {totals.pnl === 0 ? "0,00 $" : `${totals.pnl > 0 ? "+" : ""}${totals.pnl.toFixed(2)} $`}
                  </td>
                  <td className="px-2 py-2.5"></td>
                  <td className="px-2 py-2.5 text-right whitespace-nowrap">{finalBalance.toLocaleString("fr-CA")} $</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
