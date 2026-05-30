import Link from "next/link";
import { Target, BarChart3, ListFilter, ChevronRight } from "lucide-react";
import JournalKPI from "@/components/journal/JournalKPI";
import DefiCards from "@/components/journal/DefiCards";
import StrategySummary from "@/components/journal/StrategySummary";
import JournalTable from "@/components/journal/JournalTable";

export default function JournalPage() {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <nav className="text-[11px] text-muted mb-2">
        <Link href="/" className="text-blue hover:underline">Laboratoire</Link>
        <ChevronRight size={11} className="inline mx-1 opacity-40" />
        <span>Journal</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-text">Journal de trading</h1>
          <p className="text-xs text-muted mt-0.5">Personal Broker · PropFirm · Challenge Z — vue rapide multi-défis</p>
        </div>
        <div className="text-xs text-muted">MAJ : {today}</div>
      </div>

      {/* KPI cards */}
      <JournalKPI />

      {/* Vue d'ensemble par défi */}
      <div className="mb-2">
        <div className="flex items-center gap-2 text-sm font-medium text-text">
          <Target size={15} aria-hidden="true" />
          Vue d'ensemble par défi
        </div>
        <p className="text-xs text-muted mt-0.5 mb-3">Snapshot rapide de chaque front</p>
      </div>
      <DefiCards />

      {/* Résumé par stratégie */}
      <div className="mb-2 mt-2">
        <div className="flex items-center gap-2 text-sm font-medium text-text">
          <BarChart3 size={15} aria-hidden="true" />
          Résumé par stratégie
        </div>
        <p className="text-xs text-muted mt-0.5 mb-3">Une ligne par stratégie active</p>
      </div>
      <StrategySummary />

      {/* Journal détaillé */}
      <div className="mb-2 mt-2">
        <div className="flex items-center gap-2 text-sm font-medium text-text">
          <ListFilter size={15} aria-hidden="true" />
          Journal détaillé
        </div>
        <p className="text-xs text-muted mt-0.5 mb-3">Une ligne par jour ouvré · SKIP inclus pour la discipline</p>
      </div>
      <JournalTable />
    </div>
  );
}
