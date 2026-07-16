import type { CapabilityCandidate, Classification, Mode, RawCandidate } from './types';

const SENSITIVE_PATH_PATTERNS = [
    /\.env/i,
    /credential/i,
    /secret/i,
    /token/i,
    /private[-_]?key/i,
    /\.pem$/i,
    /\.key$/i,
];
const SENSITIVE_CONTENT_PATTERNS = [
    /AKIA[0-9A-Z]{16}/,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /(api[_-]?key|secret|token|password)\b\s*[:=]\s*['"]?[A-Za-z0-9_./+=-]{12,}/i,
];
const PROJECT_SPECIFIC_PATTERNS = [
    /\/(?:Users|home)\/[^/\s]+\//,
    /\bgobing-ai\b/i,
    /\brobinmin\b/i,
    /\bcloudflare\b/i,
    /\baws\b/i,
    /\bterraform\b/i,
    /\bkubernetes\b/i,
    /\barn:aws/i,
    /\bs3:\/\//i,
    /\b(?:gcr|ghcr)\.io\b/i,
    /\b\d{12}\.dkr\.ecr\./,
];
const OUTSIDE_ROOT_MUTATION_PATTERNS = [/\brm\s+(?:-[a-zA-Z]+\s+)*(?:\/(?!tmp\b)|~\/)/, />\s*(?:\/(?!tmp\b)|~\/)/];
const CODE_FILE_EXTENSIONS = /\.(?:ts|tsx|js|jsx|mjs|cjs)$/i;
const REUSABLE_CODE_PATTERNS = [/\bexport\s+(?:default\s+)?(?:async\s+)?(?:function|class|interface|type|const)\b/];

/** Classification values whose candidates are always blocked from import. */
export const BLOCKED_CLASSIFICATIONS: ReadonlySet<Classification> = new Set([
    'sensitive',
    'project-specific',
    'ts-libs-candidate',
]);

function detectModes(candidate: RawCandidate): Mode[] {
    const haystack = `${candidate.relativeSourcePath}\n${candidate.content}`.toLowerCase();
    const modes: Mode[] = [];
    for (const mode of ['app', 'lib', 'cli', 'mono'] as const) {
        if (
            haystack.includes(`mode: ${mode}`) ||
            haystack.includes(`mode=${mode}`) ||
            haystack.includes(`${mode} mode`)
        ) {
            modes.push(mode);
        }
    }
    return modes.length > 0 ? modes : ['app', 'lib', 'cli', 'mono'];
}

function hasMatch(patterns: RegExp[], text: string): boolean {
    return patterns.some((pattern) => pattern.test(text));
}

function looksLikeReusableCode(candidate: RawCandidate): boolean {
    return (
        CODE_FILE_EXTENSIONS.test(candidate.relativeSourcePath) && hasMatch(REUSABLE_CODE_PATTERNS, candidate.content)
    );
}

/** Optional hints passed to {@link classifyCandidate} for project-aware filtering. */
export interface ClassifyContext {
    /** Source-project identifiers (e.g. its package name) treated as project-specific markers. */
    projectMarkers?: string[];
}

function classifyRaw(
    candidate: RawCandidate,
    context?: ClassifyContext,
): { classification: Classification; rationale: string[] } {
    const haystack = `${candidate.relativeSourcePath}\n${candidate.content}`;
    const rationale: string[] = [];

    if (
        hasMatch(SENSITIVE_PATH_PATTERNS, candidate.relativeSourcePath) ||
        hasMatch(SENSITIVE_CONTENT_PATTERNS, haystack)
    ) {
        rationale.push('Matched sensitive path or content pattern.');
        return { classification: 'sensitive', rationale };
    }

    if (hasMatch(PROJECT_SPECIFIC_PATTERNS, haystack)) {
        rationale.push('Contains project, organization, path, cloud, or deployment-specific markers.');
        return { classification: 'project-specific', rationale };
    }

    if (looksLikeReusableCode(candidate)) {
        rationale.push('Looks like reusable implementation code; review for surgical extraction to ts-libs.');
        return { classification: 'ts-libs-candidate', rationale };
    }

    const markers = context?.projectMarkers ?? [];
    if (markers.some((marker) => marker.length > 0 && haystack.includes(marker))) {
        rationale.push('Mentions the source project package name; repository-specific unless parameterized.');
        return { classification: 'project-specific', rationale };
    }

    if (hasMatch(OUTSIDE_ROOT_MUTATION_PATTERNS, candidate.content)) {
        rationale.push('Contains commands that may mutate files outside the project root; manual review required.');
        return { classification: 'unknown', rationale };
    }

    const modes = detectModes(candidate);
    if (modes.length < 4) {
        rationale.push(`Mentions mode-specific applicability: ${modes.join(', ')}.`);
        return { classification: 'mode-specific', rationale };
    }

    if (candidate.type === 'skill' || candidate.type === 'command') {
        rationale.push('Canonical agent capability with no sensitive or project-specific markers.');
        return { classification: 'generic', rationale };
    }

    rationale.push('Config candidate requires manual review before import.');
    return { classification: 'unknown', rationale };
}

/**
 *  Classify a single discovered candidate using deterministic heuristics for
 *  sensitivity, project specificity, code reusability, and mode scope.
 */
export function classifyCandidate(candidate: RawCandidate, context?: ClassifyContext): CapabilityCandidate {
    const result = classifyRaw(candidate, context);
    const base = {
        id: candidate.id,
        type: candidate.type,
        sourcePath: candidate.sourcePath,
        relativeSourcePath: candidate.relativeSourcePath,
        classification: result.classification,
        supportedModes: detectModes(candidate),
        rationale: result.rationale,
        requiredConfirmation: true as const,
    };
    if (candidate.type === 'code') {
        return {
            ...base,
            type: 'code',
            discoveryStrategy: 'review-only',
            destinationPath: null,
            sourceDigest: candidate.sourceDigest,
            extractionTarget: result.classification === 'ts-libs-candidate' ? 'ts-libs' : 'rejected',
            handPortChecklist: [
                'Open the source file explicitly and review its dependencies.',
                'Choose ts-base or ts-libs ownership before writing code.',
                'Hand-adapt the smallest reusable seam; never copy via converge apply.',
                'Run the target repository quality gates after adaptation.',
            ],
        };
    }
    return {
        ...base,
        type: candidate.type,
        discoveryStrategy: 'copy',
        destinationPath: candidate.destinationPath,
    };
}

/** Classify a batch of raw candidates. */
export function classifyCandidates(candidates: RawCandidate[], context?: ClassifyContext): CapabilityCandidate[] {
    return candidates.map((candidate) => classifyCandidate(candidate, context));
}
