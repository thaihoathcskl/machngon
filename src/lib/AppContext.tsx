import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_LIBRARY_CATEGORIES } from '../content/library/categories';
import { DEFAULT_LIBRARY_COLLECTIONS } from '../content/library/collections';
import { SEED_DOCUMENTS } from '../content/seedDocuments';
import { normalizeCategoryName } from './library/validation';
import {
  LayoutPreferences,
  LIBRARY_FONT_SCALE_MAP,
  loadActiveJourneyId,
  loadCompletedDocIds,
  loadCustomAdminDocs,
  loadCustomCategories,
  loadCustomCollections,
  loadLabSessions,
  loadLayoutPrefs,
  loadOpenedDocIds,
  loadReadingNotes,
  loadRubricScores,
  loadSavedDocIds,
  loadUserProfile,
  saveActiveJourneyId,
  saveCompletedDocIds,
  saveCustomAdminDocs,
  saveCustomCategories,
  saveCustomCollections,
  saveLabSessions,
  saveLayoutPrefs,
  saveOpenedDocIds,
  saveReadingNotes,
  saveRubricScores,
  saveSavedDocIds,
  saveUserProfile,
} from './storage';
import {
  LabSession,
  LibraryCategoryMeta,
  LibraryCollection,
  LibraryDocument,
  ReadingNote,
  RubricScoreEntry,
  UserProfile,
} from './types';

const LEGACY_V1_COLLECTION_IDS = new Set([
  'nhap-mon-tu-duy-phan-bien',
  'ngon-ngu-dien-ngon-va-y-nghia',
  'doi-thoai-triet-hoc-va-tu-do',
  'doc-sau-van-hoc-va-ly-luan',
  'cong-dan-tri-thuc-trong-ky-nguyen-so',
]);

function resolveInitialCollections(): LibraryCollection[] {
  const stored = loadCustomCollections();
  if (
    !stored ||
    stored.length === 0 ||
    (stored.length <= 5 && stored.every((c) => LEGACY_V1_COLLECTION_IDS.has(c.id)))
  ) {
    return DEFAULT_LIBRARY_COLLECTIONS;
  }
  return stored;
}

interface AppContextValue {
  user: UserProfile;
  updateUser: (patch: Partial<UserProfile>) => void;
  signIn: (email: string, name?: string) => void;
  signOut: () => void;

  documents: LibraryDocument[];
  publishedDocuments: LibraryDocument[];
  upsertAdminDocument: (doc: LibraryDocument) => void;
  deleteAdminDocument: (id: string) => void;

  adminSessionToken: string | null;
  setAdminSessionToken: (token: string | null) => void;

  categories: LibraryCategoryMeta[];
  visibleCategories: LibraryCategoryMeta[];
  upsertCategory: (cat: LibraryCategoryMeta) => void;
  deleteCategory: (id: string) => { ok: boolean; reason?: string };
  reorderCategories: (id: string, direction: 'up' | 'down') => void;

  collections: LibraryCollection[];
  publishedCollections: LibraryCollection[];
  upsertCollection: (col: LibraryCollection) => void;
  deleteCollection: (id: string) => void;

  savedDocIds: string[];
  toggleSavedDoc: (id: string) => void;

  completedDocIds: string[];
  toggleCompletedDoc: (id: string) => void;
  markDocCompleted: (id: string) => void;

  openedDocIds: string[];
  markDocOpened: (id: string) => void;

  activeJourneyId: string;
  setActiveJourneyId: (id: string) => void;

  rubricScores: RubricScoreEntry[];
  addRubricScore: (entry: Omit<RubricScoreEntry, 'id' | 'timestamp'>) => void;

  notes: ReadingNote[];
  addReadingNote: (
    documentId: string,
    content: string,
    blockId?: string,
    sectionId?: string,
    sectionTitle?: string
  ) => void;
  updateReadingNote: (noteId: string, content: string) => void;
  deleteReadingNote: (noteId: string) => void;

  sessions: LabSession[];
  upsertSession: (session: LabSession) => void;
  deleteSession: (sessionId: string) => void;

  layoutPrefs: LayoutPreferences;
  updateLayoutPrefs: (patch: Partial<LayoutPreferences>) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile>(() => loadUserProfile());
  const [customDocs, setCustomDocs] = useState<LibraryDocument[]>(() => loadCustomAdminDocs());
  const [categories, setCategories] = useState<LibraryCategoryMeta[]>(
    () => loadCustomCategories() ?? DEFAULT_LIBRARY_CATEGORIES
  );
  const [collections, setCollections] = useState<LibraryCollection[]>(
    () => resolveInitialCollections()
  );
  const [savedDocIds, setSavedDocIds] = useState<string[]>(() => loadSavedDocIds());
  const [completedDocIds, setCompletedDocIds] = useState<string[]>(() => loadCompletedDocIds());
  const [openedDocIds, setOpenedDocIds] = useState<string[]>(() => loadOpenedDocIds());
  const [activeJourneyId, setActiveJourneyIdState] = useState<string>(() => loadActiveJourneyId());
  const [rubricScores, setRubricScores] = useState<RubricScoreEntry[]>(() => loadRubricScores());
  const [notes, setNotes] = useState<ReadingNote[]>(() => loadReadingNotes());
  const [sessions, setSessions] = useState<LabSession[]>(() => loadLabSessions());
  const [layoutPrefs, setLayoutPrefs] = useState<LayoutPreferences>(() => loadLayoutPrefs());
  // Kept strictly in React memory (never localStorage/sessionStorage)
  const [adminSessionToken, setAdminSessionToken] = useState<string | null>(null);

  useEffect(() => saveUserProfile(user), [user]);
  useEffect(() => saveCustomAdminDocs(customDocs), [customDocs]);
  useEffect(() => {
    if (!adminSessionToken) return;
    const controller = new AbortController();
    fetch('/api/knowledge/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminSessionToken}`,
      },
      body: JSON.stringify({ documents: customDocs }),
      signal: controller.signal,
    }).catch(() => {
      // Ignore transient network or abort errors during background RAG sync
    });
    return () => controller.abort();
  }, [customDocs, adminSessionToken]);
  useEffect(() => saveCustomCategories(categories), [categories]);
  useEffect(() => saveCustomCollections(collections), [collections]);
  useEffect(() => saveSavedDocIds(savedDocIds), [savedDocIds]);
  useEffect(() => saveCompletedDocIds(completedDocIds), [completedDocIds]);
  useEffect(() => saveOpenedDocIds(openedDocIds), [openedDocIds]);
  useEffect(() => saveActiveJourneyId(activeJourneyId), [activeJourneyId]);
  useEffect(() => saveRubricScores(rubricScores), [rubricScores]);
  useEffect(() => saveReadingNotes(notes), [notes]);
  useEffect(() => saveLabSessions(sessions), [sessions]);
  useEffect(() => {
    saveLayoutPrefs(layoutPrefs);
    if (typeof document !== 'undefined') {
      const sizeKey = layoutPrefs.readingFontSize ?? 'md';
      const scale = LIBRARY_FONT_SCALE_MAP[sizeKey] ?? 1;
      document.documentElement.style.setProperty('--library-font-scale', String(scale));
      document.documentElement.setAttribute('data-library-font-size', sizeKey);
    }
  }, [layoutPrefs]);

  const documents = useMemo(() => {
    const customMap = new Map(customDocs.map((d) => [d.id, d]));
    const mergedSeed = SEED_DOCUMENTS.map((d) => {
      const override = customMap.get(d.id);
      if (!override) return d;
      return {
        ...override,
        category: normalizeCategoryName(override.category),
      };
    });
    const seedIds = new Set(SEED_DOCUMENTS.map((d) => d.id));
    const added = customDocs
      .filter((d) => !seedIds.has(d.id))
      .map((d) => ({
        ...d,
        category: normalizeCategoryName(d.category),
      }));
    return [...added, ...mergedSeed];
  }, [customDocs]);

  const publishedDocuments = useMemo(
    () => documents.filter((d) => d.status === 'published'),
    [documents]
  );

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.order - b.order),
    [categories]
  );

  const visibleCategories = useMemo(
    () => sortedCategories.filter((c) => !c.hidden),
    [sortedCategories]
  );

  const sortedCollections = useMemo(
    () => [...collections].sort((a, b) => a.order - b.order),
    [collections]
  );

  const publishedCollections = useMemo(() => {
    const publishedIds = new Set(publishedDocuments.map((d) => d.id));
    return sortedCollections
      .filter((col) => col.status === 'published')
      .map((col) => ({
        ...col,
        documentIds: col.documentIds.filter((id) => publishedIds.has(id)),
      }))
      .filter((col) => col.documentIds.length > 0);
  }, [sortedCollections, publishedDocuments]);

  const updateUser = useCallback((patch: Partial<UserProfile>) => {
    setUser((prev) => ({ ...prev, ...patch }));
  }, []);

  const signIn = useCallback((email: string, name?: string) => {
    setUser((prev) => ({
      ...prev,
      email,
      name: name?.trim() || prev.name || email.split('@')[0],
      isAuthenticated: true,
    }));
  }, []);

  const signOut = useCallback(() => {
    setUser((prev) => ({ ...prev, isAuthenticated: false }));
  }, []);

  const upsertAdminDocument = useCallback((doc: LibraryDocument) => {
    const normalizedDoc: LibraryDocument = {
      ...doc,
      category: normalizeCategoryName(doc.category),
    };
    setCustomDocs((prev) => {
      const idx = prev.findIndex((d) => d.id === normalizedDoc.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = normalizedDoc;
        return copy;
      }
      return [normalizedDoc, ...prev];
    });
  }, []);

  const deleteAdminDocument = useCallback((id: string) => {
    setCustomDocs((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const upsertCategory = useCallback((cat: LibraryCategoryMeta) => {
    setCategories((prev) => {
      const idx = prev.findIndex((item) => item.id === cat.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = cat;
        return next;
      }
      return [...prev, cat];
    });
  }, []);

  const deleteCategory = useCallback(
    (id: string): { ok: boolean; reason?: string } => {
      const target = categories.find((c) => c.id === id);
      if (!target) return { ok: false, reason: 'Không tìm thấy danh mục.' };
      const inUseCount = documents.filter(
        (d) => normalizeCategoryName(d.category) === target.name
      ).length;
      if (inUseCount > 0) {
        return {
          ok: false,
          reason: `Không thể xóa vì đang có ${inUseCount} tài liệu thuộc danh mục "${target.name}". Hãy ẩn danh mục hoặc chuyển tài liệu sang danh mục khác trước.`,
        };
      }
      setCategories((prev) => prev.filter((c) => c.id !== id));
      return { ok: true };
    },
    [categories, documents]
  );

  const reorderCategories = useCallback((id: string, direction: 'up' | 'down') => {
    setCategories((prev) => {
      const ordered = [...prev].sort((a, b) => a.order - b.order);
      const idx = ordered.findIndex((c) => c.id === id);
      if (idx < 0) return prev;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= ordered.length) return prev;
      const copy = [...ordered];
      [copy[idx], copy[swapIdx]] = [copy[swapIdx], copy[idx]];
      return copy.map((item, i) => ({ ...item, order: i + 1 }));
    });
  }, []);

  const upsertCollection = useCallback((col: LibraryCollection) => {
    setCollections((prev) => {
      const idx = prev.findIndex((item) => item.id === col.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = col;
        return next;
      }
      return [...prev, col];
    });
  }, []);

  const deleteCollection = useCallback((id: string) => {
    setCollections((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const toggleSavedDoc = useCallback((id: string) => {
    setSavedDocIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [id, ...prev]
    );
  }, []);

  const toggleCompletedDoc = useCallback((id: string) => {
    setCompletedDocIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [id, ...prev]
    );
  }, []);

  const markDocCompleted = useCallback((id: string) => {
    setCompletedDocIds((prev) => (prev.includes(id) ? prev : [id, ...prev]));
  }, []);

  const markDocOpened = useCallback((id: string) => {
    setOpenedDocIds((prev) => {
      if (prev[0] === id) return prev;
      return [id, ...prev.filter((item) => item !== id)].slice(0, 120);
    });
  }, []);

  const setActiveJourneyId = useCallback((id: string) => {
    setActiveJourneyIdState((prev) => (prev === id ? '' : id));
  }, []);

  const addRubricScore = useCallback((entry: Omit<RubricScoreEntry, 'id' | 'timestamp'>) => {
    const fullEntry: RubricScoreEntry = {
      ...entry,
      id: `rubric_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
    };
    setRubricScores((prev) => [fullEntry, ...prev].slice(0, 120));
  }, []);

  const addReadingNote = useCallback(
    (
      documentId: string,
      content: string,
      blockId?: string,
      sectionId?: string,
      sectionTitle?: string
    ) => {
      const trimmed = content.trim();
      if (!trimmed) return;
      const newNote: ReadingNote = {
        id: `note_${Date.now().toString(36)}`,
        documentId,
        blockId,
        sectionId,
        sectionTitle,
        content: trimmed,
        createdAt: new Date().toISOString(),
      };
      setNotes((prev) => [newNote, ...prev]);
    },
    []
  );

  const updateReadingNote = useCallback((noteId: string, content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;
    setNotes((prev) =>
      prev.map((note) =>
        note.id === noteId
          ? { ...note, content: trimmed, updatedAt: new Date().toISOString() }
          : note
      )
    );
  }, []);

  const deleteReadingNote = useCallback((noteId: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  }, []);

  const upsertSession = useCallback((session: LabSession) => {
    setSessions((prev) => {
      const idx = prev.findIndex((s) => s.id === session.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = session;
        return next.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      }
      return [session, ...prev];
    });
  }, []);

  const deleteSession = useCallback((sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
  }, []);

  const updateLayoutPrefs = useCallback((patch: Partial<LayoutPreferences>) => {
    setLayoutPrefs((prev) => ({ ...prev, ...patch }));
  }, []);

  return (
    <AppContext.Provider
      value={{
        user,
        updateUser,
        signIn,
        signOut,
        documents,
        publishedDocuments,
        upsertAdminDocument,
        deleteAdminDocument,
        adminSessionToken,
        setAdminSessionToken,
        categories: sortedCategories,
        visibleCategories,
        upsertCategory,
        deleteCategory,
        reorderCategories,
        collections: sortedCollections,
        publishedCollections,
        upsertCollection,
        deleteCollection,
        savedDocIds,
        toggleSavedDoc,
        completedDocIds,
        toggleCompletedDoc,
        markDocCompleted,
        openedDocIds,
        markDocOpened,
        activeJourneyId,
        setActiveJourneyId,
        rubricScores,
        addRubricScore,
        notes,
        addReadingNote,
        updateReadingNote,
        deleteReadingNote,
        sessions,
        upsertSession,
        deleteSession,
        layoutPrefs,
        updateLayoutPrefs,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used inside AppProvider');
  }
  return ctx;
}
