/** Supported project layout modes. */
export type Mode = 'app' | 'lib' | 'cli' | 'mono';

/** Kinds of importable agent capabilities. */
export type CandidateKind = 'skill' | 'command' | 'config' | 'code';

/** Capability kinds that can be copied after explicit approval. */
export type CopyCandidateKind = Exclude<CandidateKind, 'code'>;

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
interface RawCandidateBase {
    id: string;
    type: CandidateKind;
    sourcePath: string;
    relativeSourcePath: string;
    content: string;
}

/** Raw copy-mode candidate: a self-contained file or config block slated for verbatim import. */
export interface RawCopyCandidate extends RawCandidateBase {
    type: CopyCandidateKind;
    destinationPath: string;
}

/** Raw code candidate: a source file slated for review-only / hand-port import. */
export interface RawCodeCandidate extends RawCandidateBase {
    type: 'code';
    destinationPath: null;
    sourceDigest: string;
}

/** A candidate as discovered, before classification. */
export type RawCandidate = RawCopyCandidate | RawCodeCandidate;

/** A classified candidate with rationale, supported modes, and destination. */
interface CandidateBase {
    id: string;
    type: CandidateKind;
    sourcePath: string;
    relativeSourcePath: string;
    classification: Classification;
    supportedModes: Mode[];
    rationale: string[];
    requiredConfirmation: true;
}

/** Classified copy candidate: a writable artifact that apply may copy verbatim. */
export interface CopyCandidate extends CandidateBase {
    type: CopyCandidateKind;
    discoveryStrategy: 'copy';
    destinationPath: string;
}

/** Where a code candidate's implementation lives after hand-port. */
export type ExtractionTarget = 'ts-base' | 'ts-libs' | 'rejected';

/** Classified review-only candidate: an implementation reference surfaced for human review, never auto-applied. */
export interface ReviewOnlyCodeCandidate extends CandidateBase {
    type: 'code';
    discoveryStrategy: 'review-only';
    destinationPath: null;
    sourceDigest: string;
    extractionTarget: ExtractionTarget;
    handPortChecklist: string[];
}

/** Classified candidates are discriminated by whether apply may copy them. */
export type CapabilityCandidate = CopyCandidate | ReviewOnlyCodeCandidate;

/** Narrow a classified candidate before entering a writable apply path. */
export function isCopyCandidate(candidate: CapabilityCandidate): candidate is CopyCandidate {
    return candidate.discoveryStrategy === 'copy';
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
    redactions: {
        sensitiveCount: number;
    };
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
    code?: CodeDiscoveryOptions;
}

/** Knobs that constrain code-candidate discovery within a source project. */
export interface CodeDiscoveryOptions {
    /** Source-project-relative roots. Absolute paths and escaping paths are rejected. */
    roots: string[];
    maxFileBytes: number;
    maxCandidates: number;
}

/** Lifecycle state of a single code-candidate port entry. */
export type CodePortState = 'pending' | 'approved' | 'ported' | 'rejected' | 'deferred';

/** One row of the code-port tracking ledger. */
export interface CodePortEntry {
    sourceKey: string;
    candidateId: string;
    reviewedSourceDigest: string;
    state: CodePortState;
    targetRepository?: 'ts-base' | 'ts-libs';
    targetPath?: string;
    notes?: string;
    updatedAt: string;
}

/** Persisted ledger of code-port lifecycle entries, versioned for forward compatibility. */
export interface CodePortTracking {
    schemaVersion: 1;
    entries: CodePortEntry[];
}

/** Read-side projection of {@link CodePortTracking} for a single candidate. */
export interface CodePortTrackingView {
    sourceKey: string;
    candidateId: string;
    state: CodePortState | 'needs-review';
    entry?: CodePortEntry;
}

/** Summary of the apply step: applied, skipped, and blocked IDs. */
export interface ApplyResult {
    applied: string[];
    skipped: string[];
    blocked: string[];
}
