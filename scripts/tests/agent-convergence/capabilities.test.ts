import { describe, expect, it } from 'bun:test';
import { annotateSupportedModes, wireAgentSkillsSymlink } from '../../agent-convergence/capabilities';

describe('capabilities module', () => {
    it('exports annotateSupportedModes', () => {
        expect(annotateSupportedModes).toBeFunction();
        expect(wireAgentSkillsSymlink).toBeFunction();
    });
});
