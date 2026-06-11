export type Mode = 'app' | 'lib' | 'cli' | 'mono';

export type CandidateKind = 'skill' | 'command' | 'config' | 'code';

export type CandidateTypeFilter = CandidateKind | 'skills' | 'commands' | 'configs' | 'all';

export type Classification =
    | 'generic'
    | 'mode-specific'
    | 'ts-libs-candidate'
    | 'project-specific'
    | 'sensitive'
    | 'unknown';

export interface RawCandidate {
    id: string;
    type: CandidateKind;
    sourcePath: string;
    relativeSourcePath: string;
    destinationPath: string;
    content: string;
}

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

export interface ProposedChange {
    candidateId: string;
    action: 'create' | 'update' | 'skip';
    destinationPath: string;
    reason: string;
}

export interface BlockedCandidate {
    candidateId: string;
    classification: Classification;
    reason: string;
}

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

export interface ConvergenceScanOptions {
    sourceProject: string;
    targetRoot: string;
    targetMode: Mode;
    typeFilter: CandidateTypeFilter;
}

export interface ApplyResult {
    applied: string[];
    skipped: string[];
    blocked: string[];
}
