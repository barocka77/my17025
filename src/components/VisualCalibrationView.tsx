import { useState, useCallback, useRef } from 'react';
import { Upload, X, Cpu, CheckCircle, AlertCircle, Loader2, Download, Trash2, Camera, ChevronDown, ChevronUp, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface PhaseData {
  u_v: number | null;
  i_a: number | null;
  p_w: number | null;
  q_var: number | null;
  s_va: number | null;
  cos_phi: number | null;
}

interface ExtractionResult {
  l1: PhaseData;
  l2: PhaseData;
  l3: PhaseData;
  frequency_hz: number | null;
  voltage_ref: number | null;
}

interface ImageFile {
  id: string;
  file: File;
  preview: string;
}

interface EditableResult extends ExtractionResult {
  device_label: string;
  notes: string;
}

const emptyPhase = (): PhaseData => ({
  u_v: null, i_a: null, p_w: null, q_var: null, s_va: null, cos_phi: null,
});

const emptyResult = (): EditableResult => ({
  l1: emptyPhase(), l2: emptyPhase(), l3: emptyPhase(),
  frequency_hz: null, voltage_ref: null,
  device_label: '', notes: '',
});

const PHASE_FIELDS: { key: keyof PhaseData; label: string; unit: string }[] = [
  { key: 'u_v', label: 'U', unit: 'V' },
  { key: 'i_a', label: 'I', unit: 'A' },
  { key: 'p_w', label: 'P', unit: 'W' },
  { key: 'q_var', label: 'Q', unit: 'var' },
  { key: 's_va', label: 'S', unit: 'VA' },
  { key: 'cos_phi', label: 'CosΦ', unit: '' },
];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function VisualCalibrationView() {
  const { user } = useAuth();
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [result, setResult] = useState<EditableResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<EditableResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((files: FileList | File[]) => {
    const newImages: ImageFile[] = Array.from(files)
      .filter(f => f.type.startsWith('image/'))
      .map(f => ({
        id: crypto.randomUUID(),
        file: f,
        preview: URL.createObjectURL(f),
      }));
    setImages(prev => [...prev, ...newImages]);
    setResult(null);
    setExtractionError(null);
    setSaveSuccess(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const removeImage = (id: string) => {
    setImages(prev => {
      const img = prev.find(i => i.id === id);
      if (img) URL.revokeObjectURL(img.preview);
      return prev.filter(i => i.id !== id);
    });
    if (images.length <= 1) {
      setResult(null);
      setExtractionError(null);
    }
  };

  const handleExtract = async () => {
    if (images.length === 0) return;
    setIsExtracting(true);
    setExtractionError(null);
    setResult(null);
    setSaveSuccess(false);

    try {
      const imagePayloads = await Promise.all(
        images.map(async (img) => ({
          data: await fileToBase64(img.file),
          mediaType: img.file.type,
        }))
      );

      const { data, error } = await supabase.functions.invoke('anthropic-vision', {
        body: { images: imagePayloads },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const extracted: ExtractionResult = data.result;
      setResult({
        ...extracted,
        l1: extracted.l1 ?? emptyPhase(),
        l2: extracted.l2 ?? emptyPhase(),
        l3: extracted.l3 ?? emptyPhase(),
        device_label: '',
        notes: '',
      });
    } catch (err: unknown) {
      setExtractionError(err instanceof Error ? err.message : 'Bilinmeyen hata');
    } finally {
      setIsExtracting(false);
    }
  };

  const updatePhase = (phase: 'l1' | 'l2' | 'l3', field: keyof PhaseData, value: string) => {
    setResult(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [phase]: {
          ...prev[phase],
          [field]: value === '' ? null : parseFloat(value),
        },
      };
    });
  };

  const updateSummary = (field: 'frequency_hz' | 'voltage_ref', value: string) => {
    setResult(prev => {
      if (!prev) return prev;
      return { ...prev, [field]: value === '' ? null : parseFloat(value) };
    });
  };

  const handleSave = async () => {
    if (!result || !user) return;
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    const record = {
      created_by: user.id,
      device_label: result.device_label,
      notes: result.notes,
      source_image_names: images.map(i => i.file.name),
      l1_u_v: result.l1.u_v, l1_i_a: result.l1.i_a, l1_p_w: result.l1.p_w,
      l1_q_var: result.l1.q_var, l1_s_va: result.l1.s_va, l1_cos_phi: result.l1.cos_phi,
      l2_u_v: result.l2.u_v, l2_i_a: result.l2.i_a, l2_p_w: result.l2.p_w,
      l2_q_var: result.l2.q_var, l2_s_va: result.l2.s_va, l2_cos_phi: result.l2.cos_phi,
      l3_u_v: result.l3.u_v, l3_i_a: result.l3.i_a, l3_p_w: result.l3.p_w,
      l3_q_var: result.l3.q_var, l3_s_va: result.l3.s_va, l3_cos_phi: result.l3.cos_phi,
      frequency_hz: result.frequency_hz,
      voltage_ref: result.voltage_ref,
    };

    const { error } = await supabase.from('calibration_results').insert(record);

    if (error) {
      setSaveError(error.message);
    } else {
      setSaveSuccess(true);
      setHistory(prev => [result, ...prev]);
    }
    setIsSaving(false);
  };

  const formatVal = (v: number | null | undefined) =>
    v === null || v === undefined ? '—' : v;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md">
            <Camera className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Görsel Kalibrasyon Veri Aktarım Modülü</h1>
            <p className="text-xs text-slate-500">AI destekli cihaz ekranı okuma ve LIMS'e aktarım</p>
          </div>
        </div>
        <div className="mt-3 h-px bg-gradient-to-r from-blue-200 via-slate-200 to-transparent" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left: Upload */}
        <div className="space-y-4">
          {/* Dropzone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200
              ${isDragging
                ? 'border-blue-400 bg-blue-50 scale-[1.01]'
                : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/30'
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={e => e.target.files && addFiles(e.target.files)}
            />
            <div className="flex flex-col items-center gap-3">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${isDragging ? 'bg-blue-100' : 'bg-slate-100'}`}>
                <Upload className={`w-6 h-6 ${isDragging ? 'text-blue-500' : 'text-slate-400'}`} />
              </div>
              <div>
                <p className="font-semibold text-slate-700 text-sm">Fotoğraf sürükleyin veya seçin</p>
                <p className="text-xs text-slate-400 mt-0.5">Referans Sayacı ve Multimetre ekran görüntüleri</p>
              </div>
              <span className="text-[10px] bg-slate-100 text-slate-500 px-3 py-1 rounded-full">
                PNG, JPG, JPEG, WEBP
              </span>
            </div>
          </div>

          {/* Image Previews */}
          {images.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Yüklenen Görseller ({images.length})
              </p>
              <div className="grid grid-cols-2 gap-3">
                {images.map(img => (
                  <div key={img.id} className="relative group rounded-xl overflow-hidden border border-slate-100 aspect-video bg-slate-50">
                    <img
                      src={img.preview}
                      alt={img.file.name}
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    <button
                      onClick={e => { e.stopPropagation(); removeImage(img.id); }}
                      className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-[9px] text-white truncate">{img.file.name}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Extract Button */}
              <button
                onClick={handleExtract}
                disabled={isExtracting || images.length === 0}
                className="mt-4 w-full flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl font-semibold text-sm transition-all shadow-sm hover:shadow-md disabled:cursor-not-allowed"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    AI Analiz Ediyor...
                  </>
                ) : (
                  <>
                    <Cpu className="w-4 h-4" />
                    AI ile Verileri Çıkar
                  </>
                )}
              </button>
            </div>
          )}

          {/* Extraction Error */}
          {extractionError && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700">Veri çıkarma hatası</p>
                <p className="text-xs text-red-600 mt-0.5">{extractionError}</p>
              </div>
            </div>
          )}

          {/* AI Loading Indicator */}
          {isExtracting && (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 text-center">
              <div className="flex justify-center mb-3">
                <div className="relative w-12 h-12">
                  <div className="absolute inset-0 border-4 border-blue-200 rounded-full" />
                  <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <Cpu className="absolute inset-0 m-auto w-5 h-5 text-blue-600" />
                </div>
              </div>
              <p className="text-sm font-semibold text-blue-800">ISO 17025 AI Analizi</p>
              <p className="text-xs text-blue-600 mt-1">Cihaz ekranlarındaki değerler okunuyor...</p>
            </div>
          )}
        </div>

        {/* Right: Result Grid */}
        <div className="space-y-4">
          {result ? (
            <>
              {/* Meta fields */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <p className="text-sm font-semibold text-slate-800">Çıkarılan Veriler — Doğrulayın ve Düzenleyin</p>
                </div>
                <div className="grid grid-cols-1 gap-3 mb-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Cihaz / Oturum Etiketi</label>
                    <input
                      type="text"
                      value={result.device_label}
                      onChange={e => setResult(p => p ? { ...p, device_label: e.target.value } : p)}
                      placeholder="örn. Wattmeter #3 — 28.04.2026"
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-slate-50"
                    />
                  </div>
                </div>

                {/* Summary row */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Frekans (Hz)</label>
                    <input
                      type="number"
                      value={result.frequency_hz ?? ''}
                      onChange={e => updateSummary('frequency_hz', e.target.value)}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Referans Gerilim (V)</label>
                    <input
                      type="number"
                      value={result.voltage_ref ?? ''}
                      onChange={e => updateSummary('voltage_ref', e.target.value)}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-slate-50"
                    />
                  </div>
                </div>

                {/* Phase table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left py-2 pr-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-16">Parametre</th>
                        {(['l1', 'l2', 'l3'] as const).map(ph => (
                          <th key={ph} className="text-center py-2 px-2">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              ph === 'l1' ? 'bg-blue-100 text-blue-700'
                              : ph === 'l2' ? 'bg-amber-100 text-amber-700'
                              : 'bg-green-100 text-green-700'
                            }`}>{ph.toUpperCase()}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {PHASE_FIELDS.map(({ key, label, unit }) => (
                        <tr key={key} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                          <td className="py-2 pr-3 font-semibold text-slate-600">
                            {label}
                            {unit && <span className="ml-1 text-slate-400 font-normal">({unit})</span>}
                          </td>
                          {(['l1', 'l2', 'l3'] as const).map(ph => (
                            <td key={ph} className="py-1.5 px-2">
                              <input
                                type="number"
                                step="any"
                                value={result[ph][key] ?? ''}
                                onChange={e => updatePhase(ph, key, e.target.value)}
                                placeholder="—"
                                className="w-full text-center border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-slate-800 placeholder-slate-300 text-xs"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Notes */}
                <div className="mt-4">
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Notlar</label>
                  <textarea
                    rows={2}
                    value={result.notes}
                    onChange={e => setResult(p => p ? { ...p, notes: e.target.value } : p)}
                    placeholder="İsteğe bağlı açıklama..."
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-slate-50 resize-none"
                  />
                </div>
              </div>

              {/* Save */}
              <button
                onClick={handleSave}
                disabled={isSaving || saveSuccess}
                className={`w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-sm transition-all shadow-sm hover:shadow-md
                  ${saveSuccess
                    ? 'bg-green-500 text-white cursor-default'
                    : 'bg-slate-900 hover:bg-slate-800 text-white disabled:bg-slate-300 disabled:cursor-not-allowed'
                  }`}
              >
                {isSaving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Kaydediliyor...</>
                ) : saveSuccess ? (
                  <><CheckCircle className="w-4 h-4" />LIMS'e Aktarıldı</>
                ) : (
                  <><Save className="w-4 h-4" />LIMS'e Aktar</>
                )}
              </button>

              {saveError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{saveError}</p>
                </div>
              )}
            </>
          ) : (
            /* Placeholder when no result yet */
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 flex flex-col items-center justify-center text-center min-h-[400px]">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                <Download className="w-7 h-7 text-slate-300" />
              </div>
              <p className="font-semibold text-slate-400 text-sm">Veri Doğrulama Tablosu</p>
              <p className="text-xs text-slate-300 mt-1 max-w-xs">
                Fotoğraf yükleyip "AI ile Verileri Çıkar" butonuna tıkladıktan sonra burada ölçüm değerleri görünecek
              </p>

              {/* Column headers preview */}
              <div className="mt-6 flex gap-2">
                {['L1', 'L2', 'L3'].map((ph, i) => (
                  <div key={ph} className={`w-16 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold opacity-30 ${
                    i === 0 ? 'bg-blue-100 text-blue-600'
                    : i === 1 ? 'bg-amber-100 text-amber-600'
                    : 'bg-green-100 text-green-600'
                  }`}>{ph}</div>
                ))}
              </div>
            </div>
          )}

          {/* Session history */}
          {history.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <button
                onClick={() => setShowHistory(h => !h)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
              >
                <span className="text-sm font-semibold text-slate-700">Bu oturumda kaydedilen ({history.length})</span>
                {showHistory ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>
              {showHistory && (
                <div className="border-t border-slate-100 divide-y divide-slate-50">
                  {history.map((h, i) => (
                    <div key={i} className="px-5 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-slate-700">{h.device_label || `Kayıt #${history.length - i}`}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          L1: {formatVal(h.l1.u_v)}V / {formatVal(h.l1.i_a)}A &nbsp;·&nbsp;
                          {h.frequency_hz ? `${h.frequency_hz} Hz` : '—'}
                        </p>
                      </div>
                      <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* New session button */}
          {saveSuccess && (
            <button
              onClick={() => {
                setImages([]);
                setResult(null);
                setSaveSuccess(false);
                setSaveError(null);
                setExtractionError(null);
              }}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 border border-slate-200 hover:border-slate-300 bg-white rounded-xl text-sm font-medium text-slate-600 hover:text-slate-800 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Yeni Analiz Başlat
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
