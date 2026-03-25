// System Feed — the unified stream of everything the System pushes to the Hunter

export type FeedItemType =
  | 'directive'      // The ONE thing to do now
  | 'insight'        // Pattern/prediction the System surfaced
  | 'warning'        // Something going wrong
  | 'tactic'         // New approach the System crafted
  | 'shadow_intel'   // Shadow agent found something
  | 'milestone'      // Skill/chain/streak milestone approaching or hit
  | 'system_status'  // System state change (COMT phase, mode change)
  | 'penalty'        // Penalty/decay notice
  | 'mission_batch'; // Today's missions (collapsible)

export interface FeedItem {
  id: string;
  type: FeedItemType;
  title: string;
  body: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string; // ISO
  action?: {
    label: string;
    handler: string; // key for callback lookup
  };
  dismissed?: boolean;
  metadata?: Record<string, any>;
}
