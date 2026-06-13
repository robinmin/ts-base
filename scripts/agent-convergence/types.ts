/** Supported project layout modes. */
export type Mode = 'app' | 'lib' | 'cli' | 'mono';

/** Kinds of importable agent capabilities. */
export type CandidateKind = 'skill' | 'command' | 'config' | 'code';

/** User-facing type filter values for the converge CLI. */
export type CandidateTypeFilter = CandidateKind | 'skills' | 'commands' | 'configs' | 'all';

/** Safety and ownership classification for a discovered candidate. */
export type Classification =
    | 'generic'
    | 'mode-specific'
    | 'ts-libs-candidate'
    | 'project-specific'
    | 'sensitive'
    | 'unknown';

/** A candidate as discovered, before classification. */
export interface RawCandidate {
    id: string;
    type: CandidateKind;
    sourcePath: string;
    relativeSourcePath: string;
    destinationPath: string;
    content: string;
}

/** A classified candidate with rationale, supported modes, and destination. */
export interface CapabilityCandidate {
    id: string;
    type: CandidateKind;
    sourcePath: string;
    relativeSourcePath: string;
    destinationPath: string;
    classification: Classification;
    supportedModes: Mode[];
    rationale: string[];
    requiredConfirmation: true;
}

/** A proposed file-system change from the review step. */
export interface ProposedChange {
    candidateId: string;
    action: 'create' | 'update' | 'skip';
    destinationPath: string;
    reason: string;
}

/** A candidate that was blocked from import with its reason. */
export interface BlockedCandidate {
    candidateId: string;
    classification: Classification;
    reason: string;
}

/** The full review artifact produced by a convergence scan. */
export interface CapabilityReview {
    sourceProject: string;
    targetRoot: string;
    targetMode: Mode;
    createdAt: string;
    candidates: CapabilityCandidate[];
    proposedChanges: ProposedChange[];
    blocked: BlockedCandidate[];
    /** Optional for artifacts written before these fields existed. */
    risks?: string[];
    openQuestions?: string[];
}

/** Options passed to the discovery and classification pipeline. */
export interface ConvergenceScanOptions {
    sourceProject: string;
    targetRoot: string;
    targetMode: Mode;
    typeFilter: CandidateTypeFilter;
}

/** Summary of the apply step: applied, skipped, and blocked IDs. */
export interface ApplyResult {
    applied: string[];
    skipped: string[];
    blocked: string[];
}
