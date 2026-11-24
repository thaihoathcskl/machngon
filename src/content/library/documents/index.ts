import type { LibraryDocument } from '../../../lib/types';
import { V2_LIBRARY_DOCUMENTS } from '../v2Adapter.ts';

/**
 * Complete catalog of 91 verified, published Library documents
 * ingested from the machngon-v2 corpus across all 6 canonical disciplines
 * and 3 difficulty levels (17 intro, 44 explore, 30 advanced).
 */
export const ALL_LIBRARY_DOCUMENTS: LibraryDocument[] = V2_LIBRARY_DOCUMENTS;
