/**
 * Discriminated union for unified mission list rendered on the Index dashboard.
 *
 * Every mission carries a `kind` discriminator so the toggle router can
 * exhaustively dispatch with a `never` safeguard at the end of the switch.
 *
 * Adding a new mission kind:
 *   1) Add a new variant below.
 *   2) Add a matching case in `useMissionToggleRouter`.
 *   3) The `never` branch will fail to compile until you do.
 */

export type MissionKind = 'protocol' | 'calibrated' | 'pillar' | 'shadow' | 'emergency';

export interface MissionBadge {
  label: string;
  color: string;
}

interface MissionBase {
  id: string;
  title: string;
  xp: number;
  completed: boolean;
  badge?: MissionBadge | null;
  borderGlow?: string | null;
  persuasionMessage?: string | null;
  description?: string;
  timeBlock?: string;
}

export interface ProtocolMission extends MissionBase {
  kind: 'protocol';
}

export interface CalibratedMission extends MissionBase {
  kind: 'calibrated';
}

export interface PillarMission extends MissionBase {
  kind: 'pillar';
  /** Original pillar id without the `pillar-` prefix. */
  pillarId: string;
}

export interface ShadowMission extends MissionBase {
  kind: 'shadow';
}

export interface EmergencyMission extends MissionBase {
  kind: 'emergency';
}

export type Mission =
  | ProtocolMission
  | CalibratedMission
  | PillarMission
  | ShadowMission
  | EmergencyMission;

/**
 * Legacy adapter shape used by `<MissionBatch />` and `<SystemFeedCard />`.
 * The components currently expect a `type` field — we expose both `kind` and
 * `type` to keep them happy without forcing a parallel UI refactor.
 */
export type LegacyMissionView = Mission & { type: MissionKind };

export const toLegacyMission = (m: Mission): LegacyMissionView => ({ ...m, type: m.kind });
