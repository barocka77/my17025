import { useState, useEffect } from 'react';
import { X, Search, FileText, Loader2 } from 'lucide-react';
import { fetchActiveDocuments, saveDocumentLink, formatRevDate } from '../utils/documentLinkService';
import type { DocumentMeta } from '../utils/documentLinkService';

interface DocumentSelectModalProps {
  isOpen: boolean;
  moduleKey: string;
  onSelect: (doc: DocumentMeta) => void;
  onClose: () => void;
}

export default function DocumentSelectModal({ isOpen, moduleKey, onSelect, onClose }: DocumentSelectModalProps) {
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [filtered, setFiltered] = useState<DocumentMeta[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetchActiveDocuments().then((docs) => {
      setDocuments(docs);
      setFiltered(docs);
      setLoading(false);
    });
  }, [isOpen]);

  useEffect(() => {
    const q = search.toLocaleLowerCase('tr-TR').trim();
    if (!q) {
      setFiltered(documents);
      return;
    }
    setFiltered(
      documents.filter(
        (d) =>
          d.dokuman_kodu.toLocaleLowerCase('tr-TR').includes(q) ||
          d.dokuman_adi.toLocaleLowerCase('tr-TR').includes(q)
      )
    );
  }, [search, documents]);

  const handleSelect = async (doc: DocumentMeta) => {
    setSaving(doc.id);
    const ok = await saveDocumentLink(moduleKey, doc.id);
    setSaving(null);
    if (ok) {
      onSelect(doc);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-slate-700 to-slate-600 rounded-t-xl">
          <div>
            <h3 className="text-lg font-bold text-white">Doküman Seçimi</h3>
            <p className="text-sm text-slate-300 mt-0.5">
              Bu modül için bir form/doküman bağlayın
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="px-6 py-3 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Doküman kodu veya adı ile arayın..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
              <span className="ml-2 text-sm text-slate-500">Yükleniyor...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-sm text-gray-500">
              {search ? 'Eşleşen doküman bulunamadı.' : 'Aktif doküman bulunamadı.'}
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => handleSelect(doc)}
                  disabled={saving !== null}
                  className="w-full flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-slate-50 transition-colors text-left group disabled:opacity-60"
                >
                  <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-slate-200 transition-colors flex-shrink-0">
                    <FileText className="w-4 h-4 text-slate-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800">
                        {doc.dokuman_kodu}
                      </span>
                      {doc.rev_no && (
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          Rev.{doc.rev_no}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 truncate">{doc.dokuman_adi}</p>
                    {doc.revizyon_tarihi && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Revizyon: {formatRevDate(doc.revizyon_tarihi)}
                      </p>
                    )}
                  </div>
                  {saving === doc.id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-500 flex-shrink-0" />
                  ) : (
                    <span className="text-xs font-medium text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      Seç
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <p className="text-xs text-gray-500 text-center">
            Yalnızca aktif dokümanlar listelenmektedir. Seçiminiz kaydedilecektir.
          </p>
        </div>
      </div>
    </div>
  );
}
