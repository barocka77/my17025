import { useState, useEffect, useCallback } from 'react';
import { getLinkedDocument } from '../utils/documentLinkService';
import type { DocumentMeta } from '../utils/documentLinkService';

interface UseModuleDocumentReturn {
  documentMeta: DocumentMeta | null;
  needsSelection: boolean;
  loading: boolean;
  showSelector: boolean;
  openSelector: () => void;
  closeSelector: () => void;
  onDocumentSelected: (doc: DocumentMeta) => void;
  requestPdf: (generateFn: (meta: DocumentMeta) => Promise<void>) => void;
}

export function useModuleDocument(moduleKey: string): UseModuleDocumentReturn {
  const [documentMeta, setDocumentMeta] = useState<DocumentMeta | null>(null);
  const [needsSelection, setNeedsSelection] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSelector, setShowSelector] = useState(false);
  const [pendingPdfFn, setPendingPdfFn] = useState<((meta: DocumentMeta) => Promise<void>) | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getLinkedDocument(moduleKey).then((doc) => {
      if (cancelled) return;
      setDocumentMeta(doc);
      setNeedsSelection(!doc);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [moduleKey]);

  const openSelector = useCallback(() => setShowSelector(true), []);
  const closeSelector = useCallback(() => {
    setShowSelector(false);
    setPendingPdfFn(null);
  }, []);

  const onDocumentSelected = useCallback((doc: DocumentMeta) => {
    setDocumentMeta(doc);
    setNeedsSelection(false);
    setShowSelector(false);

    if (pendingPdfFn) {
      const fn = pendingPdfFn;
      setPendingPdfFn(null);
      fn(doc);
    }
  }, [pendingPdfFn]);

  const requestPdf = useCallback((generateFn: (meta: DocumentMeta) => Promise<void>) => {
    if (documentMeta) {
      generateFn(documentMeta);
    } else {
      setPendingPdfFn(() => generateFn);
      setShowSelector(true);
    }
  }, [documentMeta]);

  return {
    documentMeta,
    needsSelection,
    loading,
    showSelector,
    openSelector,
    closeSelector,
    onDocumentSelected,
    requestPdf,
  };
}
