import type { LibraryConcept } from '../../lib/types';
import { V2_LIBRARY_CONCEPTS } from './v2Adapter.ts';

/**
 * Complete glossary of 230 academic & literary concepts ingested from machngon-v2 gloss.json,
 * linked bidirectionally with all 91 articles in ALL_LIBRARY_DOCUMENTS.
 */
export const LIBRARY_CONCEPTS: LibraryConcept[] = V2_LIBRARY_CONCEPTS;
