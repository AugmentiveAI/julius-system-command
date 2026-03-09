import { Eye, CheckCircle, X, Radar, ExternalLink } from 'lucide-react';
import { ResearchFinding } from '@/types/learning';

interface ShadowIntelPanelProps {
  findings: ResearchFinding[];
  onMarkRead: (id: string) => void;
  onActOn: (id: string) => void;
  onDismiss: (id: string) => void;
}

function ShadowFindingCard({
  finding,
  onMarkRead,
  onActOn,
  onDismiss,
}: {
  finding: ResearchFinding;
  onMarkRead: () => void;
  onActOn: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="font-tech text-xs text-foreground line-clamp-2">{finding.content.title}</h4>
          <p className="font-mono text-[9px] text-muted-foreground mt-0.5">
            {finding.source.type}: {finding.source.target}
          </p>
        </div>
        <span className="shrink-0 inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] text-primary">
          {finding.content.relevanceScore}/10
        </span>
      </div>

      <p className="font-mono text-[10px] text-foreground/70 leading-relaxed line-clamp-3">
        {finding.content.summary}
      </p>

      {finding.content.keyInsights.length > 0 && (
        <div className="space-y-1">
          {finding.content.keyInsights.slice(0, 3).map((insight, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <span className="font-mono text-[9px] text-primary shrink-0 mt-0.5">→</span>
              <span className="font-mono text-[9px] text-foreground/60">{insight}</span>
            </div>
          ))}
        </div>
      )}

      {finding.synthesis && (
        <div className="rounded-md border border-secondary/20 bg-secondary/5 p-2">
          <p className="font-mono text-[9px] text-secondary">Connection: {finding.synthesis.connectionToUser}</p>
          <p className="font-mono text-[9px] text-secondary/70 mt-0.5">→ {finding.synthesis.suggestedAction}</p>
        </div>
      )}

      <div className="flex items-center gap-1.5 pt-1">
        <button
          onClick={onActOn}
          className="flex items-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-2 py-1 font-mono text-[9px] text-primary hover:bg-primary/10 transition-colors"
        >
          <CheckCircle className="h-2.5 w-2.5" />
          Act On
        </button>
        <button
          onClick={onMarkRead}
          className="flex items-center gap-1 rounded-md border border-border px-2 py-1 font-mono text-[9px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <Eye className="h-2.5 w-2.5" />
          Read
        </button>
        <button
          onClick={onDismiss}
          className="flex items-center gap-1 rounded-md border border-border px-2 py-1 font-mono text-[9px] text-muted-foreground hover:text-destructive transition-colors"
        >
          <X className="h-2.5 w-2.5" />
          Dismiss
        </button>
        {finding.source.url && (
          <a
            href={finding.source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 font-mono text-[9px] text-muted-foreground hover:text-primary transition-colors"
          >
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        )}
      </div>
    </div>
  );
}

export function ShadowIntelPanel({ findings, onMarkRead, onActOn, onDismiss }: ShadowIntelPanelProps) {
  if (findings.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-center">
        <Radar className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
        <p className="font-mono text-[10px] text-muted-foreground">No new intel from your shadows.</p>
        <p className="font-mono text-[9px] text-muted-foreground/50 mt-1">
          Research shadows are monitoring their sources.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Radar className="h-3.5 w-3.5 text-primary" />
        <span className="font-mono text-[10px] tracking-widest text-primary uppercase">
          Shadow Intel ({findings.length})
        </span>
      </div>

      {findings.map(finding => (
        <ShadowFindingCard
          key={finding.id}
          finding={finding}
          onMarkRead={() => onMarkRead(finding.id)}
          onActOn={() => onActOn(finding.id)}
          onDismiss={() => onDismiss(finding.id)}
        />
      ))}
    </div>
  );
}
