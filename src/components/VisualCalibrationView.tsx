import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Upload, X, Cpu, CheckCircle, AlertCircle, Loader2, Camera,
  FileSpreadsheet, Plus, Trash2, FolderOpen, Save,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type PhaseGroup = '3_FAZ' | 'L1' | 'L2' | 'L3';

interface ImageFile {
  id: string;
  file: File;
  preview: string;
}

interface Session {
  id?: string;
  device_label: string;
  calibrated_device: string;
  reference_device: string;
  uncertainty: number;
  uncertainty_unit: string;
  default_voltage: number;
  default_frequency: number;
  notes: string;
}

interface Measurement {
  id?: string;
  row_order: number;
  phase_group: PhaseGroup;
  angle_label: string;
  current_a: number | null;
  voltage_v: number | null;
  frequency_hz: number | null;
  power_factor: number | null;
  reference_value: number | null;
  reference_unit: string;
  calibrated_value: number | null;
  calibrated_unit: string;
  deviation: number | null;
  uncertainty: number | null;
  source_image_name: string;
  raw_extraction: Record<string, unknown>;
  notes: string;
}

const emptySession = (): Session => ({
  device_label: '',
  calibrated_device: 'SY3640 Three Phase Portable Working Standard Meter',
  reference_device: 'Fluke 289 True RMS Multimeter',
  uncertainty: 0.006,
  uncertainty_unit: 'kHz',
  default_voltage: 220,
  default_frequency: 50,
  notes: '',
});

const emptyMeasurement = (order: number): Measurement => ({
  row_order: order,
  phase_group: '3_FAZ',
  angle_label: '60 deg',
  current_a: 10,
  voltage_v: 220,
  frequency_hz: 50,
  power_factor: 1.0,
  reference_value: null,
  reference_unit: 'kHz',
  calibrated_value: null,
  calibrated_unit: 'kHz',
  deviation: null,
  uncertainty: 0.006,
  source_image_name: '',
  raw_extraction: {},
  notes: '',
});

const PHASE_GROUPS: PhaseGroup[] = ['3_FAZ', 'L1', 'L2', 'L3'];
const ANGLE_LABELS = ['60 deg', '-60 deg'];

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

function computeDeviation(calibrated: number | null, reference: number | null): number | null {
  if (calibrated === null || reference === null) return null;
  return +(calibrated - reference).toFixed(4);
}

export default function VisualCalibrationView() {
  const { user } = useAuth();
  const [session, setSession] = useState<Session>(emptySession());
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [showSessions, setShowSessions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('calibration_sessions').select('*').order('created_at', { ascending: false }).limit(10).then(({ data }) => {
      if (data) setSessions(data as Session[]);
    });
  }, [user, saveSuccess]);

  const addFiles = useCallback((files: FileList | File[]) => {
    const newImages: ImageFile[] = Array.from(files)
      .filter(f => f.type.startsWith('image/'))
      .map(f => ({ id: crypto.randomUUID(), file: f, preview: URL.createObjectURL(f) }));
    setImages(prev => [...prev, ...newImages]);
    setExtractionError(null);
    setSaveSuccess(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const removeImage = (id: string) => {
    setImages(prev => {
      const img = prev.find(i => i.id === id);
      if (img) URL.revokeObjectURL(img.preview);
      return prev.filter(i => i.id !== id);
    });
  };

  const extractImage = async (img: ImageFile) => {
    const payload = [{ data: await fileToBase64(img.file), mediaType: img.file.type }];
    const { data, error } = await supabase.functions.invoke('anthropic-vision', { body: { images: payload } });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);

    const r = data.result;
    const ref = r?.reference?.value ?? null;
    const refUnit = r?.reference?.unit ?? 'kHz';
    const nominal = r?.calibrated_nominal?.value ?? null;
    const nominalUnit = r?.calibrated_nominal?.unit ?? refUnit;

    return {
      ...emptyMeasurement(0),
      reference_value: ref,
      reference_unit: refUnit,
      calibrated_value: nominal,
      calibrated_unit: nominalUnit,
      deviation: computeDeviation(nominal, ref),
      uncertainty: session.uncertainty,
      voltage_v: session.default_voltage,
      frequency_hz: session.default_frequency,
      source_image_name: img.file.name,
      raw_extraction: r,
    } as Measurement;
  };

  const handleExtractAll = async () => {
    if (images.length === 0) return;
    setIsExtracting(true);
    setExtractionError(null);
    try {
      const extracted: Measurement[] = [];
      for (const img of images) {
        const row = await extractImage(img);
        extracted.push(row);
      }
      setMeasurements(prev => {
        const base = prev.length;
        return [...prev, ...extracted.map((m, i) => ({ ...m, row_order: base + i }))];
      });
      images.forEach(i => URL.revokeObjectURL(i.preview));
      setImages([]);
    } catch (err: unknown) {
      setExtractionError(err instanceof Error ? err.message : 'Bilinmeyen hata');
    } finally {
      setIsExtracting(false);
    }
  };

  const updateMeasurement = <K extends keyof Measurement>(idx: number, field: K, value: Measurement[K]) => {
    setMeasurements(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      if (field === 'reference_value' || field === 'calibrated_value') {
        copy[idx].deviation = computeDeviation(copy[idx].calibrated_value, copy[idx].reference_value);
      }
      return copy;
    });
  };

  const addManualRow = () => {
    setMeasurements(prev => [...prev, { ...emptyMeasurement(prev.length), uncertainty: session.uncertainty }]);
  };

  const removeRow = (idx: number) => {
    setMeasurements(prev => prev.filter((_, i) => i !== idx).map((m, i) => ({ ...m, row_order: i })));
  };

  const handleSaveSession = async () => {
    if (!user || measurements.length === 0) return;
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const { data: sessionData, error: sErr } = await supabase
        .from('calibration_sessions')
        .insert({ ...session, created_by: user.id })
        .select()
        .maybeSingle();
      if (sErr) throw sErr;
      if (!sessionData) throw new Error('Oturum oluşturulamadı');

      const rows = measurements.map(m => ({
        session_id: sessionData.id,
        created_by: user.id,
        row_order: m.row_order,
        phase_group: m.phase_group,
        angle_label: m.angle_label,
        current_a: m.current_a,
        voltage_v: m.voltage_v,
        frequency_hz: m.frequency_hz,
        power_factor: m.power_factor,
        reference_value: m.reference_value,
        reference_unit: m.reference_unit,
        calibrated_value: m.calibrated_value,
        calibrated_unit: m.calibrated_unit,
        deviation: m.deviation,
        uncertainty: m.uncertainty,
        source_image_name: m.source_image_name,
        raw_extraction: m.raw_extraction,
        notes: m.notes,
      }));

      const { error: mErr } = await supabase.from('calibration_measurements').insert(rows);
      if (mErr) throw mErr;

      setSaveSuccess(true);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Kayıt hatası');
    } finally {
      setIsSaving(false);
    }
  };

  const exportToExcel = () => {
    if (measurements.length === 0) return;

    const fmt = (v: number | null, unit: string) =>
      v === null ? '' : `${v.toLocaleString('tr-TR', { maximumFractionDigits: 4 })} ${unit}`;

    const header = [
      'Kademe / Range', 'Akım', 'Gerilim', 'Frekans', 'PF',
      'Referans Cihaz', 'Kalibre Edilen Cihaz', 'Sapma', 'Belirsizlik ±',
      'Grup', 'Açı', 'Kaynak Fotoğraf',
    ];

    const body = measurements.map(m => [
      m.current_a !== null ? `${m.current_a} A` : '',
      m.current_a !== null ? `${m.current_a} A` : '',
      m.voltage_v !== null ? `${m.voltage_v} V` : '',
      m.frequency_hz !== null ? `${m.frequency_hz} Hz` : '',
      m.power_factor !== null ? `${m.power_factor.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} pF` : '',
      fmt(m.reference_value, m.reference_unit),
      fmt(m.calibrated_value, m.calibrated_unit),
      fmt(m.deviation, m.reference_unit),
      fmt(m.uncertainty, session.uncertainty_unit),
      m.phase_group.replace('_', ' '),
      m.angle_label,
      m.source_image_name,
    ]);

    const meta = [
      ['Cihaz Etiketi', session.device_label],
      ['Kalibre Edilen Cihaz', session.calibrated_device],
      ['Referans Cihaz', session.reference_device],
      ['Belirsizlik', `${session.uncertainty} ${session.uncertainty_unit}`],
      [],
      ['9. Ölçüm Sonuçları / Measurement Results'],
      [],
    ];

    const ws = XLSX.utils.aoa_to_sheet([...meta, header, ...body]);
    ws['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
      { wch: 16 }, { wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 26 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ölçüm Sonuçları');
    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `kalibrasyon_sertifika_${date}.xlsx`);
  };

  const newSession = () => {
    setSession(emptySession());
    setMeasurements([]);
    setImages([]);
    setSaveSuccess(false);
    setSaveError(null);
    setExtractionError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Görsel Kalibrasyon Veri Aktarım Modülü</h1>
              <p className="text-xs text-slate-500">Oturum tabanlı · AI okuma · Sertifika formatında Excel</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSessions(s => !s)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:border-slate-300 rounded-lg transition"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Kayıtlı Oturumlar
            </button>
            <button
              onClick={newSession}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Yeni Oturum
            </button>
          </div>
        </div>
        <div className="mt-3 h-px bg-gradient-to-r from-blue-200 via-slate-200 to-transparent" />
      </div>

      {showSessions && (
        <div className="mb-6 bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Son Oturumlar</p>
          {sessions.length === 0 ? (
            <p className="text-xs text-slate-400">Henüz kayıtlı oturum yok.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {sessions.map((s, i) => (
                <li key={i} className="py-2">
                  <p className="text-sm font-semibold text-slate-800">{s.device_label || 'Etiketsiz Oturum'}</p>
                  <p className="text-[11px] text-slate-500">{s.calibrated_device}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Oturum Bilgileri</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Cihaz Etiketi" value={session.device_label} onChange={v => setSession(s => ({ ...s, device_label: v }))} placeholder="ör. Sayaç-001 / 28.04.2026" />
          <Field label="Kalibre Edilen Cihaz" value={session.calibrated_device} onChange={v => setSession(s => ({ ...s, calibrated_device: v }))} />
          <Field label="Referans Cihaz" value={session.reference_device} onChange={v => setSession(s => ({ ...s, reference_device: v }))} />
          <Field label={`Belirsizlik (${session.uncertainty_unit})`} value={String(session.uncertainty)} onChange={v => setSession(s => ({ ...s, uncertainty: parseFloat(v) || 0 }))} type="number" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="space-y-4 xl:col-span-1">
          <div
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all
              ${isDragging ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300'}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={e => e.target.files && addFiles(e.target.files)}
            />
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                <Upload className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-700">Fotoğraf yükleyin</p>
              <p className="text-[11px] text-slate-400">Her fotoğraf tablodaki bir satıra dönüşür</p>
            </div>
          </div>

          {images.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Kuyruk ({images.length})
                </p>
                <button
                  onClick={handleExtractAll}
                  disabled={isExtracting}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-semibold"
                >
                  {isExtracting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Cpu className="w-3.5 h-3.5" />}
                  Hepsini Çıkar
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {images.map(img => (
                  <div key={img.id} className="relative group rounded-lg overflow-hidden border border-slate-100 aspect-video bg-slate-50">
                    <img src={img.preview} alt="" className="w-full h-full object-contain" />
                    <button
                      onClick={e => { e.stopPropagation(); removeImage(img.id); }}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                    >
                      <X className="w-2.5 h-2.5 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {extractionError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{extractionError}</p>
            </div>
          )}
        </div>

        <div className="xl:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">Ölçüm Sonuçları ({measurements.length})</p>
              <button
                onClick={addManualRow}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-200 hover:border-slate-300 rounded-lg"
              >
                <Plus className="w-3 h-3" /> Satır Ekle
              </button>
            </div>

            {measurements.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-sm font-semibold text-slate-400">Henüz satır yok</p>
                <p className="text-xs text-slate-300 mt-1">Fotoğraf yükleyip "Hepsini Çıkar" deyin ya da elle satır ekleyin.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="text-left px-2 py-2 font-semibold">Grup</th>
                      <th className="text-left px-2 py-2 font-semibold">Açı</th>
                      <th className="text-center px-2 py-2 font-semibold">Akım</th>
                      <th className="text-center px-2 py-2 font-semibold">V</th>
                      <th className="text-center px-2 py-2 font-semibold">Hz</th>
                      <th className="text-center px-2 py-2 font-semibold">PF</th>
                      <th className="text-center px-2 py-2 font-semibold bg-blue-50">Referans</th>
                      <th className="text-center px-2 py-2 font-semibold bg-emerald-50">Kalibre Edilen</th>
                      <th className="text-center px-2 py-2 font-semibold bg-amber-50">Sapma</th>
                      <th className="text-center px-2 py-2 font-semibold">Belirsizlik ±</th>
                      <th className="px-1"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {measurements.map((m, i) => (
                      <tr key={i} className="border-t border-slate-50 hover:bg-slate-50/50">
                        <td className="px-1 py-1">
                          <select
                            value={m.phase_group}
                            onChange={e => updateMeasurement(i, 'phase_group', e.target.value as PhaseGroup)}
                            className="w-full text-[11px] border border-slate-200 rounded px-1 py-1 bg-white"
                          >
                            {PHASE_GROUPS.map(g => <option key={g} value={g}>{g.replace('_', ' ')}</option>)}
                          </select>
                        </td>
                        <td className="px-1 py-1">
                          <select
                            value={m.angle_label}
                            onChange={e => updateMeasurement(i, 'angle_label', e.target.value)}
                            className="w-full text-[11px] border border-slate-200 rounded px-1 py-1 bg-white"
                          >
                            {ANGLE_LABELS.map(a => <option key={a} value={a}>{a}</option>)}
                          </select>
                        </td>
                        <NumCell value={m.current_a} onChange={v => updateMeasurement(i, 'current_a', v)} />
                        <NumCell value={m.voltage_v} onChange={v => updateMeasurement(i, 'voltage_v', v)} />
                        <NumCell value={m.frequency_hz} onChange={v => updateMeasurement(i, 'frequency_hz', v)} />
                        <NumCell value={m.power_factor} onChange={v => updateMeasurement(i, 'power_factor', v)} step="0.01" />
                        <NumCell value={m.reference_value} onChange={v => updateMeasurement(i, 'reference_value', v)} step="any" highlight="blue" />
                        <NumCell value={m.calibrated_value} onChange={v => updateMeasurement(i, 'calibrated_value', v)} step="any" highlight="emerald" />
                        <td className="px-1 py-1 text-center font-semibold text-amber-700 bg-amber-50/50">
                          {m.deviation !== null ? m.deviation.toLocaleString('tr-TR', { maximumFractionDigits: 4 }) : '—'}
                        </td>
                        <NumCell value={m.uncertainty} onChange={v => updateMeasurement(i, 'uncertainty', v)} step="any" />
                        <td className="px-1 py-1 text-center">
                          <button onClick={() => removeRow(i)} className="text-slate-300 hover:text-red-500">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {measurements.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleSaveSession}
                disabled={isSaving || saveSuccess}
                className={`flex-1 min-w-[180px] flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition shadow-sm hover:shadow
                  ${saveSuccess ? 'bg-green-500 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white disabled:bg-slate-300'}`}
              >
                {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" />Kaydediliyor...</>
                 : saveSuccess ? <><CheckCircle className="w-4 h-4" />Kaydedildi</>
                 : <><Save className="w-4 h-4" />Oturumu Kaydet</>}
              </button>
              <button
                onClick={exportToExcel}
                className="flex-1 min-w-[180px] flex items-center justify-center gap-2 px-5 py-3 border border-green-200 hover:border-green-400 bg-white hover:bg-green-50 rounded-xl text-sm font-semibold text-green-700"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Sertifika Excel İndir
              </button>
            </div>
          )}

          {saveError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{saveError}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-slate-50"
      />
    </div>
  );
}

function NumCell({ value, onChange, step = 'any', highlight }: {
  value: number | null; onChange: (v: number | null) => void; step?: string; highlight?: 'blue' | 'emerald';
}) {
  const bg = highlight === 'blue' ? 'bg-blue-50/40' : highlight === 'emerald' ? 'bg-emerald-50/40' : '';
  return (
    <td className={`px-1 py-1 ${bg}`}>
      <input
        type="number"
        step={step}
        value={value ?? ''}
        onChange={e => onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
        className="w-full text-[11px] text-center border border-slate-200 rounded px-1 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
      />
    </td>
  );
}
