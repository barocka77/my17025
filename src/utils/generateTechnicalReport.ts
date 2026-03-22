export function downloadTechnicalReport() {
  const reportDate = '22 Mart 2026';

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Teknik Durum Raporu — ISO 17025 Uyum Yönetim Sistemi</title>
<style>
  :root {
    --blue: #1e40af;
    --blue-light: #dbeafe;
    --blue-mid: #3b82f6;
    --gray-dark: #111827;
    --gray-mid: #374151;
    --gray: #6b7280;
    --gray-light: #f3f4f6;
    --border: #e5e7eb;
    --red: #dc2626;
    --red-light: #fee2e2;
    --green: #16a34a;
    --green-light: #dcfce7;
    --yellow: #ca8a04;
    --yellow-light: #fef9c3;
    --orange: #ea580c;
    --orange-light: #ffedd5;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    font-size: 13px;
    line-height: 1.6;
    color: var(--gray-dark);
    background: #fff;
    max-width: 1100px;
    margin: 0 auto;
    padding: 40px 48px;
  }

  /* HEADER */
  .report-header {
    background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 60%, #2563eb 100%);
    color: #fff;
    padding: 40px 48px;
    margin: -40px -48px 48px;
    border-bottom: 4px solid #93c5fd;
  }
  .report-header h1 {
    font-size: 24px;
    font-weight: 700;
    letter-spacing: -0.3px;
    margin-bottom: 6px;
  }
  .report-header .subtitle {
    font-size: 14px;
    opacity: 0.85;
    font-weight: 400;
  }
  .report-header .meta {
    margin-top: 20px;
    display: flex;
    gap: 32px;
    font-size: 12px;
    opacity: 0.75;
    border-top: 1px solid rgba(255,255,255,0.2);
    padding-top: 16px;
  }
  .report-header .meta span { font-weight: 600; color: #bfdbfe; }

  /* PRINT BUTTON */
  .print-bar {
    background: var(--blue-light);
    border: 1px solid #bfdbfe;
    border-radius: 8px;
    padding: 12px 20px;
    margin-bottom: 32px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .print-bar p { font-size: 12px; color: var(--blue); }
  .btn-print {
    background: var(--blue);
    color: #fff;
    border: none;
    padding: 8px 20px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    letter-spacing: 0.3px;
  }
  .btn-print:hover { background: #1d4ed8; }

  /* TOC */
  .toc {
    background: var(--gray-light);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 24px 28px;
    margin-bottom: 48px;
  }
  .toc h3 {
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: var(--gray);
    margin-bottom: 14px;
  }
  .toc ol {
    columns: 2;
    column-gap: 32px;
    padding-left: 20px;
  }
  .toc li {
    font-size: 12px;
    margin-bottom: 5px;
    color: var(--blue);
    font-weight: 500;
  }

  /* SECTIONS */
  .section {
    margin-bottom: 56px;
    page-break-inside: avoid;
  }
  .section-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
    padding-bottom: 10px;
    border-bottom: 2px solid var(--blue);
  }
  .section-num {
    background: var(--blue);
    color: #fff;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    flex-shrink: 0;
  }
  .section-header h2 {
    font-size: 17px;
    font-weight: 700;
    color: var(--blue);
    letter-spacing: -0.2px;
  }

  h3 {
    font-size: 14px;
    font-weight: 700;
    color: var(--gray-dark);
    margin: 24px 0 10px;
    padding-left: 10px;
    border-left: 3px solid var(--blue-mid);
  }
  h4 {
    font-size: 13px;
    font-weight: 600;
    color: var(--gray-mid);
    margin: 16px 0 8px;
  }
  p { margin-bottom: 10px; color: var(--gray-mid); }

  /* TABLES */
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
    margin: 12px 0 20px;
  }
  thead tr {
    background: var(--blue);
    color: #fff;
  }
  thead th {
    padding: 9px 12px;
    text-align: left;
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  tbody tr:nth-child(odd) { background: var(--gray-light); }
  tbody tr:nth-child(even) { background: #fff; }
  tbody tr:hover { background: var(--blue-light); }
  td {
    padding: 8px 12px;
    border-bottom: 1px solid var(--border);
    vertical-align: top;
    line-height: 1.4;
  }
  .mono { font-family: 'Consolas', 'Courier New', monospace; font-size: 11px; background: #f8f8f8; padding: 1px 4px; border-radius: 3px; }

  /* BADGES */
  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 9999px;
    font-size: 11px;
    font-weight: 600;
    line-height: 1.6;
  }
  .badge-green { background: var(--green-light); color: var(--green); }
  .badge-red { background: var(--red-light); color: var(--red); }
  .badge-yellow { background: var(--yellow-light); color: var(--yellow); }
  .badge-blue { background: var(--blue-light); color: var(--blue); }
  .badge-orange { background: var(--orange-light); color: var(--orange); }
  .badge-gray { background: var(--gray-light); color: var(--gray); }

  /* CALLOUT BOXES */
  .callout {
    border-radius: 8px;
    padding: 14px 18px;
    margin: 12px 0;
    font-size: 12px;
    line-height: 1.6;
    border-left: 4px solid;
  }
  .callout-red { background: var(--red-light); border-color: var(--red); color: #7f1d1d; }
  .callout-yellow { background: var(--yellow-light); border-color: var(--yellow); color: #713f12; }
  .callout-blue { background: var(--blue-light); border-color: var(--blue); color: #1e3a8a; }
  .callout-green { background: var(--green-light); border-color: var(--green); color: #14532d; }
  .callout strong { font-weight: 700; display: block; margin-bottom: 3px; }

  /* CODE BLOCKS */
  pre {
    background: #1e293b;
    color: #e2e8f0;
    padding: 16px 20px;
    border-radius: 8px;
    font-size: 11.5px;
    font-family: 'Consolas', 'Courier New', monospace;
    overflow-x: auto;
    margin: 12px 0;
    line-height: 1.7;
  }
  code { font-family: 'Consolas', 'Courier New', monospace; }

  /* PRIORITY LISTS */
  .priority-list { margin: 12px 0; }
  .priority-item {
    display: flex;
    gap: 12px;
    padding: 10px 14px;
    margin-bottom: 6px;
    border-radius: 6px;
    background: var(--gray-light);
    border: 1px solid var(--border);
    font-size: 12px;
    align-items: flex-start;
  }
  .priority-item .num {
    font-size: 11px;
    font-weight: 700;
    min-width: 22px;
    height: 22px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 1px;
  }
  .p1 .num { background: var(--red); color: #fff; }
  .p2 .num { background: var(--orange); color: #fff; }
  .p3 .num { background: var(--blue-mid); color: #fff; }
  .priority-item strong { font-weight: 600; display: block; margin-bottom: 2px; }
  .priority-item .detail { color: var(--gray); font-size: 11.5px; }

  /* STATS ROW */
  .stats-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin: 20px 0 28px;
  }
  .stat-card {
    background: var(--gray-light);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 16px;
    text-align: center;
  }
  .stat-card .stat-val {
    font-size: 28px;
    font-weight: 800;
    color: var(--blue);
    line-height: 1;
    margin-bottom: 4px;
  }
  .stat-card .stat-label { font-size: 11px; color: var(--gray); font-weight: 500; }

  ul { padding-left: 20px; margin: 8px 0 12px; }
  li { margin-bottom: 4px; font-size: 12px; color: var(--gray-mid); }

  @media print {
    body { padding: 0; max-width: none; font-size: 11px; }
    .report-header { margin: 0 0 32px; padding: 28px 32px; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .print-bar { display: none !important; }
    .section { page-break-inside: avoid; }
    table { page-break-inside: auto; }
    tr { page-break-inside: avoid; page-break-after: auto; }
    thead { display: table-header-group; }
    pre { white-space: pre-wrap; }
    .stats-row { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    thead tr { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .callout { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .badge { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .p1 .num, .p2 .num, .p3 .num { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .section-num { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    @page { margin: 18mm 16mm; }
  }
</style>
</head>
<body>

<div class="report-header">
  <h1>Teknik Durum Raporu</h1>
  <p class="subtitle">ISO 17025 Uyum Yönetim Sistemi — Kapsamlı Kod ve Mimari Analizi</p>
  <div class="meta">
    <div>Tarih: <span>${reportDate}</span></div>
    <div>Hazırlayan: <span>Claude Sonnet 4.6 (AI Analysis)</span></div>
    <div>Kapsam: <span>Tüm kaynak dosyalar, edge functions, migration'lar</span></div>
  </div>
</div>

<div class="print-bar">
  <p>Bu raporu PDF olarak kaydetmek için tarayıcının yazdır (Ctrl+P / Cmd+P) penceresini kullanın ve "PDF Olarak Kaydet" seçeneğini seçin.</p>
  <button class="btn-print" onclick="window.print()">Yazdır / PDF Olarak Kaydet</button>
</div>

<div class="toc">
  <h3>İçindekiler</h3>
  <ol>
    <li>Proje Genel Yapısı</li>
    <li>Modül Envanteri</li>
    <li>Bileşen Envanteri</li>
    <li>Tamamlanan Özellikler</li>
    <li>Eksik veya Yarım Kalan Özellikler</li>
    <li>Gereksiz / Ölü Kod</li>
    <li>Numaralama Sistemi</li>
    <li>AI Entegrasyonu</li>
    <li>Güvenlik Sorunları</li>
    <li>Sıralanmış Yapılacaklar Listesi</li>
  </ol>
</div>

<div class="stats-row">
  <div class="stat-card"><div class="stat-val">25</div><div class="stat-label">Toplam Modül</div></div>
  <div class="stat-card"><div class="stat-val">47</div><div class="stat-label">Kaynak Dosyası</div></div>
  <div class="stat-card"><div class="stat-val">6</div><div class="stat-label">Edge Function</div></div>
  <div class="stat-card"><div class="stat-val">63</div><div class="stat-label">Migration Dosyası</div></div>
</div>

<!-- ======================== SECTION 1 ======================== -->
<div class="section">
  <div class="section-header">
    <div class="section-num">1</div>
    <h2>Proje Genel Yapısı</h2>
  </div>

  <h3>Tech Stack ve Versiyonlar</h3>
  <table>
    <thead><tr><th>Paket</th><th>Versiyon</th><th>Kullanım Amacı</th></tr></thead>
    <tbody>
      <tr><td><span class="mono">react</span></td><td>^18.3.1</td><td>UI framework</td></tr>
      <tr><td><span class="mono">react-dom</span></td><td>^18.3.1</td><td>DOM rendering</td></tr>
      <tr><td><span class="mono">@supabase/supabase-js</span></td><td>^2.57.4</td><td>Auth + Veritabanı + Storage</td></tr>
      <tr><td><span class="mono">jspdf</span></td><td>^4.1.0</td><td>PDF üretimi</td></tr>
      <tr><td><span class="mono">jspdf-autotable</span></td><td>^5.0.7</td><td>PDF tablo desteği</td></tr>
      <tr><td><span class="mono">lucide-react</span></td><td>^0.344.0</td><td>İkon kütüphanesi</td></tr>
      <tr><td><span class="mono">typescript</span></td><td>^5.5.3</td><td>Tip güvenliği</td></tr>
      <tr><td><span class="mono">vite</span></td><td>^5.4.2</td><td>Build tool</td></tr>
      <tr><td><span class="mono">tailwindcss</span></td><td>^3.4.1</td><td>CSS utility</td></tr>
      <tr><td><span class="mono">vite-plugin-pwa</span></td><td>^1.2.0</td><td>PWA / offline desteği</td></tr>
    </tbody>
  </table>

  <h3>Routing Yapısı</h3>
  <div class="callout callout-yellow">
    <strong>Dikkat: React Router kullanılmıyor.</strong>
    Tüm routing <span class="mono">App.tsx</span> içinde hash tabanlı manuel state ile yönetiliyor. <span class="mono">window.history.pushState</span> URL'i güncellese de <span class="mono">popstate</span> listener olmadığı için tarayıcı geri tuşu çalışmıyor.
  </div>
  <table>
    <thead><tr><th>Hash / URL</th><th>Render Edilen</th><th>Auth Gerekir mi</th></tr></thead>
    <tbody>
      <tr><td><span class="mono"># (boş)</span></td><td>Ana sayfa / son aktif modül</td><td>Evet</td></tr>
      <tr><td><span class="mono">#verify-signature</span></td><td>VerifySignature bileşeni</td><td>Hayır</td></tr>
      <tr><td><span class="mono">#survey/{uuid}</span></td><td>PublicSurveyPage</td><td>Hayır</td></tr>
      <tr><td><span class="mono">#admin</span></td><td>AdminPanel</td><td>Admin/SuperAdmin</td></tr>
      <tr><td><span class="mono">#actions</span></td><td>ActionTracking</td><td>Evet</td></tr>
      <tr><td><span class="mono">#notepad</span></td><td>PersonalNotepad</td><td>Belirli e-postalar</td></tr>
      <tr><td><span class="mono">#{moduleId}</span></td><td>İlgili modül görünümü</td><td>Evet</td></tr>
    </tbody>
  </table>

  <h3>Auth Sistemi</h3>
  <p>Supabase email/şifre kimlik doğrulaması kullanılıyor. Akış: <code>signInWithPassword()</code> → <code>onAuthStateChange</code> → <code>fetchUserRole()</code> → <code>profiles</code> tablosundan rol sorgusu → <code>AuthContext</code>'e dağıtım.</p>
  <table>
    <thead><tr><th>Rol</th><th>Yetki Seviyesi</th><th>Erişim</th></tr></thead>
    <tbody>
      <tr><td><span class="badge badge-red">super_admin</span></td><td>1 (en yüksek)</td><td>Tüm işlemler + sistem yönetimi</td></tr>
      <tr><td><span class="badge badge-orange">admin</span></td><td>2</td><td>Kullanıcı yönetimi dahil tüm işlemler</td></tr>
      <tr><td><span class="badge badge-blue">quality_manager</span></td><td>3 (yönetici)</td><td>Tüm modüller, kullanıcı oluşturma hariç</td></tr>
      <tr><td><span class="badge badge-gray">personnel</span></td><td>4</td><td>Kendi profili + kayıt görüntüleme</td></tr>
    </tbody>
  </table>
</div>

<!-- ======================== SECTION 2 ======================== -->
<div class="section">
  <div class="section-header">
    <div class="section-num">2</div>
    <h2>Modül Envanteri</h2>
  </div>

  <h3>Bölüm 1 — Laboratuvar Operasyonları</h3>
  <div class="callout callout-red">
    <strong>Kritik: Tüm bu modüller generic ModuleView ile çalışıyor.</strong>
    Tablolar için şema/kolon tanımı yok. İçerik boş.
  </div>
  <table>
    <thead><tr><th>Modül ID</th><th>Modül Adı</th><th>Tablo</th><th>Özel Bileşen</th></tr></thead>
    <tbody>
      <tr><td><span class="mono">methods_scope</span></td><td>Metodlar / Kapsam</td><td><span class="mono">methods_scope</span></td><td><span class="badge badge-red">Yok</span></td></tr>
      <tr><td><span class="mono">requests_proposals</span></td><td>Talep Teklifler Sözleşmeler</td><td><span class="mono">requests_proposals</span></td><td><span class="badge badge-red">Yok</span></td></tr>
      <tr><td><span class="mono">incoming_devices</span></td><td>Kalibrasyon Gelen Cihazlar</td><td><span class="mono">incoming_devices</span></td><td><span class="badge badge-red">Yok</span></td></tr>
      <tr><td><span class="mono">technical_records</span></td><td>Teknik Kayıtlar</td><td><span class="mono">technical_records</span></td><td><span class="badge badge-red">Yok</span></td></tr>
      <tr><td><span class="mono">reporting</span></td><td>Sonuçların Raporlanması</td><td><span class="mono">reporting</span></td><td><span class="badge badge-red">Yok</span></td></tr>
      <tr><td><span class="mono">quality_assurance</span></td><td>Sonuçların Geçerliliği (QA)</td><td><span class="mono">quality_assurance</span></td><td><span class="badge badge-red">Yok</span></td></tr>
      <tr><td><span class="mono">external_procurement</span></td><td>Dışarıdan Tedarik</td><td><span class="mono">external_procurement</span></td><td><span class="badge badge-red">Yok</span></td></tr>
    </tbody>
  </table>

  <h3>Bölüm 2 — Kalite Yönetimi</h3>
  <table>
    <thead><tr><th>Modül ID</th><th>Modül Adı</th><th>Tablo</th><th>Özel Bileşen</th></tr></thead>
    <tbody>
      <tr><td><span class="mono">risks_opportunities</span></td><td>Riskler ve Fırsatlar</td><td><span class="mono">risks_opportunities</span></td><td><span class="badge badge-green">Var</span></td></tr>
      <tr><td><span class="mono">internal_audits</span></td><td>İç Tetkikler</td><td><span class="mono">internal_audits</span></td><td><span class="badge badge-green">Var</span></td></tr>
      <tr><td><span class="mono">customer_feedback</span></td><td>Şikayetler / İtirazlar</td><td><span class="mono">feedback_records</span></td><td><span class="badge badge-green">Var</span></td></tr>
      <tr><td><span class="mono">customer_surveys</span></td><td>Müşteri Anketleri</td><td><span class="mono">customer_surveys</span></td><td><span class="badge badge-green">Var</span></td></tr>
      <tr><td><span class="mono">management_reviews</span></td><td>Yönetimin Gözden Geçirmesi</td><td><span class="mono">management_reviews</span></td><td><span class="badge badge-green">Var</span></td></tr>
      <tr><td><span class="mono">nonconformities</span></td><td>Uygunsuzluklar</td><td><span class="mono">nonconformities</span></td><td><span class="badge badge-green">Var</span></td></tr>
      <tr><td><span class="mono">corrective_actions</span></td><td>Düzeltici Faaliyetler</td><td><span class="mono">corrective_actions</span></td><td><span class="badge badge-green">Var</span></td></tr>
      <tr><td><span class="mono">process_performance</span></td><td>Proses Performansları</td><td><span class="mono">process_performance</span></td><td><span class="badge badge-red">Yok</span></td></tr>
    </tbody>
  </table>

  <h3>Bölüm 3 — Kaynak Yönetimi</h3>
  <table>
    <thead><tr><th>Modül ID</th><th>Modül Adı</th><th>Tablo</th><th>Özel Bileşen</th></tr></thead>
    <tbody>
      <tr><td><span class="mono">personnel</span></td><td>Personel</td><td><span class="mono">personnel / profiles</span></td><td><span class="badge badge-green">Var</span></td></tr>
      <tr><td><span class="mono">suppliers</span></td><td>Tedarikçiler</td><td><span class="mono">suppliers</span></td><td><span class="badge badge-green">Var</span></td></tr>
      <tr><td><span class="mono">facilities_environment</span></td><td>Tesisler ve Çevre</td><td><span class="mono">facilities_environment</span></td><td><span class="badge badge-red">Yok</span></td></tr>
      <tr><td><span class="mono">equipment_hardware</span></td><td>Donanım / Ekipman</td><td><span class="mono">equipment_hardware</span></td><td><span class="badge badge-yellow">Kısmi</span></td></tr>
    </tbody>
  </table>

  <h3>Bölüm 4 — Dokümantasyon</h3>
  <table>
    <thead><tr><th>Modül ID</th><th>Modül Adı</th><th>Tablo</th><th>Özel Bileşen</th></tr></thead>
    <tbody>
      <tr><td><span class="mono">policies</span></td><td>Politika</td><td><span class="mono">policies</span></td><td><span class="badge badge-red">Yok</span></td></tr>
      <tr><td><span class="mono">objectives</span></td><td>Hedefler</td><td><span class="mono">objectives</span></td><td><span class="badge badge-red">Yok</span></td></tr>
      <tr><td><span class="mono">system_documentation</span></td><td>Yönetim Sistemi Dok.</td><td><span class="mono">system_documentation</span></td><td><span class="badge badge-red">Yok</span></td></tr>
      <tr><td><span class="mono">records_control</span></td><td>Kayıtların Kontrolü</td><td><span class="mono">records_control</span></td><td><span class="badge badge-red">Yok</span></td></tr>
      <tr><td><span class="mono">data_control</span></td><td>Verilerin Kontrolü</td><td><span class="mono">data_control</span></td><td><span class="badge badge-red">Yok</span></td></tr>
      <tr><td><span class="mono">document_master_list</span></td><td>Ana Doküman Listesi</td><td><span class="mono">document_master_list</span></td><td><span class="badge badge-green">Var</span></td></tr>
    </tbody>
  </table>
  <p><strong>Özet:</strong> 25 modülden 12'si tam özel bileşene sahip, 1'i kısmi, 12'si generic ModuleView kullanıyor.</p>
</div>

<!-- ======================== SECTION 3 ======================== -->
<div class="section">
  <div class="section-header">
    <div class="section-num">3</div>
    <h2>Bileşen Envanteri</h2>
  </div>
  <table>
    <thead><tr><th>Dosya</th><th>Amaç</th><th>Sorgulanan Tablolar</th><th>console.log</th><th>Notlar</th></tr></thead>
    <tbody>
      <tr><td><span class="mono">App.tsx</span></td><td>Ana shell, routing, layout</td><td>—</td><td><span class="badge badge-gray">Yok</span></td><td>Hardcoded 2 e-posta (notepad erişimi)</td></tr>
      <tr><td><span class="mono">contexts/AuthContext.tsx</span></td><td>Auth state + rol yönetimi</td><td>profiles</td><td><span class="badge badge-red">~20 satır</span></td><td>Prod'da role/session bilgisi konsolda</td></tr>
      <tr><td><span class="mono">contexts/ComplianceContext.tsx</span></td><td>Deadline takibi, sistem kilidi</td><td>feedback_records, equipment_hardware</td><td><span class="badge badge-orange">~6 satır</span></td><td>—</td></tr>
      <tr><td><span class="mono">components/Login.tsx</span></td><td>Giriş / kayıt formu</td><td>—</td><td><span class="badge badge-gray">Yok</span></td><td>gmail.com herkese açık kayıt</td></tr>
      <tr><td><span class="mono">components/Sidebar.tsx</span></td><td>Sol navigasyon</td><td>—</td><td><span class="badge badge-yellow">1 warn</span></td><td>Hardcoded 2 e-posta</td></tr>
      <tr><td><span class="mono">components/AdminPanel.tsx</span></td><td>Kullanıcı yönetimi</td><td>RPC: get_all_profiles, update_user_role</td><td><span class="badge badge-gray">Yok</span></td><td>Edge: admin-create-user</td></tr>
      <tr><td><span class="mono">components/ModuleView.tsx</span></td><td>Generic CRUD tablosu (13 modül)</td><td>Dinamik: module.table</td><td><span class="badge badge-orange">3 error</span></td><td>Equipment kolonu hardcoded</td></tr>
      <tr><td><span class="mono">CustomerFeedbackView.tsx</span></td><td>Geri bildirim listesi + filtre</td><td>feedback_records, nonconformity_analysis_team</td><td><span class="badge badge-gray">Yok</span></td><td>RPC: get_personnel_list</td></tr>
      <tr><td><span class="mono">CustomerFeedbackModal.tsx</span></td><td>6 sekmeli kayıt formu</td><td>feedback_records, feedback_actions, nonconformities</td><td><span class="badge badge-yellow">2</span></td><td>Otomatik NC oluşturma</td></tr>
      <tr><td><span class="mono">CustomerFeedbackDetailView.tsx</span></td><td>Detay + imza + PDF</td><td>feedback_records, feedback_actions, organizations</td><td><span class="badge badge-yellow">3</span></td><td>FR.08 PDF export</td></tr>
      <tr><td><span class="mono">NonconformitiesView.tsx</span></td><td>NC listesi, çok boyutlu filtre</td><td>nonconformities, corrective_actions</td><td><span class="badge badge-yellow">1</span></td><td>—</td></tr>
      <tr><td><span class="mono">NonconformityDetailDrawer.tsx</span></td><td>NC detay çekmecesi — analiz, kök neden, DF</td><td>nonconformities, nonconformity_root_causes, corrective_actions, record_signatures, organizations, document_master_list</td><td><span class="badge badge-red">~17 error</span></td><td>En büyük bileşen; AI DF önerisi</td></tr>
      <tr><td><span class="mono">CorrectiveActionsView.tsx</span></td><td>DF listesi, filtre, PDF</td><td>corrective_actions, nonconformities</td><td><span class="badge badge-yellow">2</span></td><td>FR.14 PDF export</td></tr>
      <tr><td><span class="mono">CorrectiveActionFormModal.tsx</span></td><td>4 sekmeli DF formu</td><td>corrective_actions, corrective_action_items</td><td><span class="badge badge-yellow">2</span></td><td>Tekrarlama → otomatik NC</td></tr>
      <tr><td><span class="mono">RisksOpportunitiesView.tsx</span></td><td>Risk matrisi + CRUD</td><td>risks_opportunities</td><td><span class="badge badge-yellow">1</span></td><td>—</td></tr>
      <tr><td><span class="mono">PersonnelView.tsx</span></td><td>Liste↔Detay router</td><td>—</td><td><span class="badge badge-gray">Yok</span></td><td>—</td></tr>
      <tr><td><span class="mono">PersonnelListView.tsx</span></td><td>Personel listesi</td><td>RPC: get_personnel_list</td><td><span class="badge badge-yellow">2</span></td><td>Edge: admin-create-user</td></tr>
      <tr><td><span class="mono">PersonnelDetailView.tsx</span></td><td>Profil düzenleme + eğitim</td><td>personnel_training</td><td><span class="badge badge-orange">4</span></td><td>RPC: get_profile_by_id, update_profile_by_id</td></tr>
      <tr><td><span class="mono">internal-audits/InternalAuditsView.tsx</span></td><td>Tetkik plan listesi</td><td>internal_audit_plans</td><td><span class="badge badge-yellow">1</span></td><td>—</td></tr>
      <tr><td><span class="mono">internal-audits/AuditPlanModal.tsx</span></td><td>Tetkik plan formu</td><td>internal_audit_plans</td><td><span class="badge badge-gray">Yok</span></td><td>31 hardcoded ISO maddesi</td></tr>
      <tr><td><span class="mono">internal-audits/AuditDetailView.tsx</span></td><td>3 sekmeli tetkik detayı</td><td>internal_audit_questions, internal_audit_nonconformities, internal_audit_reports</td><td><span class="badge badge-yellow">1</span></td><td>1sn debounce auto-save</td></tr>
      <tr><td><span class="mono">management-reviews/ManagementReviewsView.tsx</span></td><td>YGG toplantı listesi</td><td>management_reviews</td><td><span class="badge badge-yellow">1</span></td><td>—</td></tr>
      <tr><td><span class="mono">management-reviews/ManagementReviewModal.tsx</span></td><td>YGG toplantı formu</td><td>management_reviews</td><td><span class="badge badge-gray">Yok</span></td><td>—</td></tr>
      <tr><td><span class="mono">management-reviews/ManagementReviewDetailView.tsx</span></td><td>3 sekmeli YGG detayı</td><td>management_reviews, management_review_decisions</td><td><span class="badge badge-yellow">2</span></td><td>14+4 hardcoded ISO gündem maddesi</td></tr>
      <tr><td><span class="mono">suppliers/SuppliersView.tsx</span></td><td>Tedarikçi listesi, akreditasyon</td><td>suppliers</td><td><span class="badge badge-yellow">1</span></td><td>60 günlük son kullanma uyarısı</td></tr>
      <tr><td><span class="mono">suppliers/SupplierFormModal.tsx</span></td><td>Tedarikçi formu</td><td>suppliers</td><td><span class="badge badge-gray">Yok</span></td><td>—</td></tr>
      <tr><td><span class="mono">suppliers/SupplierDetailView.tsx</span></td><td>Tedarikçi detayı</td><td>suppliers</td><td><span class="badge badge-gray">Yok</span></td><td>purchase_orders tablosunu kullanmıyor</td></tr>
      <tr><td><span class="mono">CustomerSurveyView.tsx</span></td><td>Anket listesi + analitik</td><td>customer_surveys</td><td><span class="badge badge-yellow">1</span></td><td>7 soru hardcoded (duplicate)</td></tr>
      <tr><td><span class="mono">CustomerSurveyModal.tsx</span></td><td>Anket doldurma / link üretme</td><td>customer_surveys</td><td><span class="badge badge-gray">Yok</span></td><td>7 soru hardcoded (duplicate)</td></tr>
      <tr><td><span class="mono">DocumentMasterListView.tsx</span></td><td>Ana doküman listesi</td><td>document_master_list</td><td><span class="badge badge-yellow">1</span></td><td>Soft-delete desteği</td></tr>
      <tr><td><span class="mono">EquipmentFormModal.tsx</span></td><td>Ekipman ekleme/düzenleme</td><td>—</td><td><span class="badge badge-gray">Yok</span></td><td>RPC: get_personnel_list</td></tr>
      <tr><td><span class="mono">EquipmentDetailModal.tsx</span></td><td>Ekipman detayı + FR.35 PDF</td><td>—</td><td><span class="badge badge-gray">Yok</span></td><td>useModuleDocument hook entegrasyonu</td></tr>
      <tr><td><span class="mono">FiveWhyInterface.tsx</span></td><td>AI destekli 5-Neden analizi</td><td>five_why_drafts, nonconformity_root_causes</td><td><span class="badge badge-yellow">2</span></td><td>Edge: ai-proxy; taslak otomatik kaydedilir</td></tr>
      <tr><td><span class="mono">ActionTracking.tsx</span></td><td>Acil deadline panosu</td><td>feedback_records, equipment_hardware</td><td><span class="badge badge-red">6 log</span></td><td>En fazla log içeren bileşen</td></tr>
      <tr><td><span class="mono">SignaturesSection.tsx</span></td><td>Dijital imza toplama</td><td>profiles</td><td><span class="badge badge-gray">Yok</span></td><td>signatureService entegrasyonu</td></tr>
      <tr><td><span class="mono">PersonalNotepad.tsx</span></td><td>Kişisel not defteri</td><td>personal_notes</td><td><span class="badge badge-yellow">2</span></td><td>Akıllı başlık üretimi</td></tr>
      <tr><td><span class="mono">UrgentDeadlinesModal.tsx</span></td><td>Açılış deadline bildirimi</td><td>feedback_records, equipment_hardware</td><td><span class="badge badge-yellow">2</span></td><td>Günlük sıfırlama</td></tr>
      <tr><td><span class="mono">PublicSurveyPage.tsx</span></td><td>Müşteriye açık anket sayfası</td><td>customer_surveys</td><td><span class="badge badge-gray">Yok</span></td><td>Token tabanlı, auth gerektirmez</td></tr>
      <tr><td><span class="mono">VerifySignature.tsx</span></td><td>İmza doğrulama sayfası</td><td>—</td><td><span class="badge badge-gray">Yok</span></td><td>Edge: verify-signature-public</td></tr>
      <tr><td><span class="mono">OrganizationLogoUpload.tsx</span></td><td>Logo yükleme</td><td>organizations</td><td><span class="badge badge-gray">Yok</span></td><td>Storage: organization-assets</td></tr>
    </tbody>
  </table>
</div>

<!-- ======================== SECTION 4 ======================== -->
<div class="section">
  <div class="section-header">
    <div class="section-num">4</div>
    <h2>Tamamlanan Özellikler</h2>
  </div>
  <table>
    <thead><tr><th>Özellik</th><th>Durum</th></tr></thead>
    <tbody>
      <tr><td>Email/şifre kimlik doğrulama (Supabase Auth)</td><td><span class="badge badge-green">Tam</span></td></tr>
      <tr><td>4 seviyeli rol sistemi (super_admin, admin, quality_manager, personnel)</td><td><span class="badge badge-green">Tam</span></td></tr>
      <tr><td>Müşteri Geri Bildirimi tam yaşam döngüsü — 6 sekme</td><td><span class="badge badge-green">Tam</span></td></tr>
      <tr><td>Uygunsuzluk yönetimi — otomatik NC numarası, kök neden, etki analizi</td><td><span class="badge badge-green">Tam</span></td></tr>
      <tr><td>Düzeltici Faaliyet — 4 sekme, aksiyon kalemleri, takip</td><td><span class="badge badge-green">Tam</span></td></tr>
      <tr><td>Balık kılçığı (Fishbone) kök neden analizi</td><td><span class="badge badge-green">Tam</span></td></tr>
      <tr><td>AI destekli 5-Neden analizi (Anthropic claude-sonnet-4-6)</td><td><span class="badge badge-green">Tam</span></td></tr>
      <tr><td>AI destekli DF önerisi — DB'ye kaydediliyor (df_suggestion)</td><td><span class="badge badge-green">Tam</span></td></tr>
      <tr><td>Dijital imza akışı — çizim ve şifre doğrulama destekli</td><td><span class="badge badge-green">Tam</span></td></tr>
      <tr><td>Kayıt kilitleme — son imzada otomatik kilitlenme</td><td><span class="badge badge-green">Tam</span></td></tr>
      <tr><td>Email bildirimleri (Resend API ile imza sırası)</td><td><span class="badge badge-green">Tam</span></td></tr>
      <tr><td>İmza doğrulama sayfası (public, token tabanlı)</td><td><span class="badge badge-green">Tam</span></td></tr>
      <tr><td>Risk ve Fırsat matrisi (olasılık × şiddet)</td><td><span class="badge badge-green">Tam</span></td></tr>
      <tr><td>İç Tetkik — plan, sorular, uygunsuzluk, rapor</td><td><span class="badge badge-green">Tam</span></td></tr>
      <tr><td>Yönetim Gözden Geçirme (YGG) toplantı takibi</td><td><span class="badge badge-green">Tam</span></td></tr>
      <tr><td>Tedarikçi yönetimi — akreditasyon takibi, son kullanma uyarısı</td><td><span class="badge badge-green">Tam</span></td></tr>
      <tr><td>Personel yönetimi — profil, eğitim geçmişi, imza</td><td><span class="badge badge-green">Tam</span></td></tr>
      <tr><td>Ekipman / Donanım yönetimi — kalibrasyon takibi</td><td><span class="badge badge-green">Tam</span></td></tr>
      <tr><td>Ana Doküman Listesi — soft-delete, revizyon takibi</td><td><span class="badge badge-green">Tam</span></td></tr>
      <tr><td>Müşteri Anketi — doğrudan veya link tabanlı, analitik</td><td><span class="badge badge-green">Tam</span></td></tr>
      <tr><td>Acil deadline panosu + uyum kilitleme mekanizması</td><td><span class="badge badge-green">Tam</span></td></tr>
      <tr><td>Kişisel not defteri</td><td><span class="badge badge-green">Tam</span></td></tr>
      <tr><td>Kuruluş logosu yükleme</td><td><span class="badge badge-green">Tam</span></td></tr>
      <tr><td>PDF export: FR.08, FR.13, FR.14, FR.35, FR.10</td><td><span class="badge badge-green">Tam</span></td></tr>
      <tr><td>PWA desteği (service worker, offline manifest)</td><td><span class="badge badge-green">Tam</span></td></tr>
      <tr><td>Modül-doküman bağlantısı (module_document_links)</td><td><span class="badge badge-green">Tam</span></td></tr>
      <tr><td>Kullanıcı oluşturma/yönetimi (Admin Panel + Edge Function)</td><td><span class="badge badge-green">Tam</span></td></tr>
    </tbody>
  </table>
</div>

<!-- ======================== SECTION 5 ======================== -->
<div class="section">
  <div class="section-header">
    <div class="section-num">5</div>
    <h2>Eksik veya Yarım Kalan Özellikler</h2>
  </div>

  <h3>Kritik Eksiklikler</h3>
  <table>
    <thead><tr><th>#</th><th>Eksiklik</th><th>Etki</th></tr></thead>
    <tbody>
      <tr>
        <td>1</td>
        <td><strong>Laboratuvar Operasyonları modülleri boş</strong><br><span class="mono">methods_scope</span>, <span class="mono">requests_proposals</span>, <span class="mono">incoming_devices</span>, <span class="mono">technical_records</span>, <span class="mono">reporting</span>, <span class="mono">quality_assurance</span>, <span class="mono">external_procurement</span> — şema yok, kolon yok</td>
        <td><span class="badge badge-red">Yüksek</span></td>
      </tr>
      <tr>
        <td>2</td>
        <td><strong>Tarayıcı geri tuşu çalışmıyor</strong><br><span class="mono">App.tsx</span>'te <span class="mono">popstate</span> listener yok</td>
        <td><span class="badge badge-orange">Orta</span></td>
      </tr>
      <tr>
        <td>3</td>
        <td><strong>Login domain kısıtlaması eksik</strong><br>Herhangi bir gmail adresiyle kayıt mümkün, kurumsal domain yok</td>
        <td><span class="badge badge-red">Yüksek</span></td>
      </tr>
      <tr>
        <td>4</td>
        <td><strong>process_performance modülü boş</strong><br>Tablo şeması ve özel bileşen yok</td>
        <td><span class="badge badge-orange">Orta</span></td>
      </tr>
      <tr>
        <td>5</td>
        <td><strong>facilities_environment modülü boş</strong><br>Tesis/çevre koşulları için şema veya form yok</td>
        <td><span class="badge badge-orange">Orta</span></td>
      </tr>
    </tbody>
  </table>

  <h3>Orta Öncelikli Eksiklikler</h3>
  <table>
    <thead><tr><th>#</th><th>Eksiklik</th><th>Konum</th></tr></thead>
    <tbody>
      <tr><td>6</td><td>Anket soruları hardcoded — 2 farklı dosyada duplicate</td><td><span class="mono">CustomerSurveyView.tsx</span>, <span class="mono">CustomerSurveyModal.tsx</span></td></tr>
      <tr><td>7</td><td>ISO madde listesi hardcoded — kullanıcı ekleyemiyor</td><td><span class="mono">AuditPlanModal.tsx</span> (31 madde)</td></tr>
      <tr><td>8</td><td>YGG gündem maddeleri hardcoded</td><td><span class="mono">ManagementReviewDetailView.tsx</span> (14+4 madde)</td></tr>
      <tr><td>9</td><td>Tedarikçi değerlendirme ve satın alma siparişi kullanılmıyor</td><td><span class="mono">purchase_orders</span>, <span class="mono">supplier_evaluations</span> tabloları var ama bağlanmamış</td></tr>
      <tr><td>10</td><td>İç Tetkik → Uygunsuzluk bağlantısı yok</td><td><span class="mono">AuditDetailView</span>'dan oluşturulan NC'ler <span class="mono">NonconformitiesView</span>'e yansımıyor</td></tr>
      <tr><td>11</td><td>SupplierDetailView satın alma verisi göstermiyor</td><td><span class="mono">SupplierDetailView.tsx</span></td></tr>
    </tbody>
  </table>
</div>

<!-- ======================== SECTION 6 ======================== -->
<div class="section">
  <div class="section-header">
    <div class="section-num">6</div>
    <h2>Gereksiz / Ölü Kod</h2>
  </div>

  <h3>Duplicate Logic</h3>
  <table>
    <thead><tr><th>Sorun</th><th>Dosyalar</th></tr></thead>
    <tbody>
      <tr><td><strong>ai-proxy ve five-why-ai edge function'ları özdeş</strong></td><td><span class="mono">supabase/functions/ai-proxy/index.ts</span><br><span class="mono">supabase/functions/five-why-ai/index.ts</span></td></tr>
      <tr><td><strong>7 anket sorusu iki dosyada aynı şekilde tanımlı</strong></td><td><span class="mono">CustomerSurveyView.tsx</span> ve <span class="mono">CustomerSurveyModal.tsx</span> içindeki <span class="mono">QUESTIONS</span> sabiti</td></tr>
      <tr><td><strong>Acil deadline sorgusu 3 yerde ayrı ayrı yazılmış</strong></td><td><span class="mono">ComplianceContext.tsx</span>, <span class="mono">ActionTracking.tsx</span>, <span class="mono">UrgentDeadlinesModal.tsx</span></td></tr>
      <tr><td><strong>isManager kontrolü ~10 bileşende tekrarlanıyor</strong></td><td><span class="mono">role === 'admin' || role === 'super_admin' || role === 'quality_manager'</span></td></tr>
    </tbody>
  </table>

  <h3>Console.log Envanteri</h3>
  <table>
    <thead><tr><th>Dosya</th><th>Log Sayısı</th><th>Öncelik</th></tr></thead>
    <tbody>
      <tr><td><span class="mono">AuthContext.tsx</span></td><td>~20</td><td><span class="badge badge-red">Yüksek — session/role bilgisi</span></td></tr>
      <tr><td><span class="mono">ActionTracking.tsx</span></td><td>6</td><td><span class="badge badge-red">Yüksek</span></td></tr>
      <tr><td><span class="mono">ComplianceContext.tsx</span></td><td>~6</td><td><span class="badge badge-orange">Orta</span></td></tr>
      <tr><td><span class="mono">PersonnelDetailView.tsx</span></td><td>4</td><td><span class="badge badge-orange">Orta</span></td></tr>
      <tr><td><span class="mono">NonconformityDetailDrawer.tsx</span></td><td>~17 error</td><td><span class="badge badge-orange">Orta</span></td></tr>
      <tr><td>Diğer 16 bileşen</td><td>1-3'er</td><td><span class="badge badge-yellow">Düşük</span></td></tr>
    </tbody>
  </table>

  <h3>Hardcoded Değerler</h3>
  <table>
    <thead><tr><th>Değer</th><th>Konum</th><th>Risk</th></tr></thead>
    <tbody>
      <tr><td><span class="mono">toztoprakbaraka@gmail.com</span></td><td><span class="mono">App.tsx:96</span>, <span class="mono">Sidebar.tsx:34</span></td><td><span class="badge badge-red">Yüksek</span></td></tr>
      <tr><td><span class="mono">oosmanozturk06@gmail.com</span></td><td><span class="mono">App.tsx:97</span>, <span class="mono">Sidebar.tsx:34</span></td><td><span class="badge badge-red">Yüksek</span></td></tr>
      <tr><td><span class="mono">onboarding@resend.dev</span></td><td><span class="mono">send-signature-notification:124</span></td><td><span class="badge badge-orange">Orta — test sender</span></td></tr>
      <tr><td><span class="mono">FR.14</span>, <span class="mono">FR.13</span>, <span class="mono">FR-12</span>, <span class="mono">FR.10</span></td><td>PDF utility dosyaları</td><td><span class="badge badge-yellow">Düşük</span></td></tr>
      <tr><td><span class="mono">'17.03.2026'</span> (rev tarihi)</td><td><span class="mono">dfPdfExport.ts:343</span>, <span class="mono">ncPdfExport.ts:451</span></td><td><span class="badge badge-yellow">Düşük</span></td></tr>
      <tr><td><span class="mono">claude-sonnet-4-6</span> (model adı)</td><td><span class="mono">ai-proxy</span>, <span class="mono">five-why-ai</span></td><td><span class="badge badge-yellow">Düşük</span></td></tr>
      <tr><td><span class="mono">gmail.com</span> izinli domain</td><td><span class="mono">Login.tsx:27</span></td><td><span class="badge badge-orange">Orta</span></td></tr>
    </tbody>
  </table>
</div>

<!-- ======================== SECTION 7 ======================== -->
<div class="section">
  <div class="section-header">
    <div class="section-num">7</div>
    <h2>Numaralama Sistemi</h2>
  </div>
  <table>
    <thead><tr><th>Kayıt Tipi</th><th>Format</th><th>Üretim Yeri</th><th>Örnek</th></tr></thead>
    <tbody>
      <tr>
        <td>Uygunsuzluk (NC)</td>
        <td><span class="mono">YYMMDD-NNN</span></td>
        <td>Supabase trigger<br><span class="mono">20260316193143_update_nc_number_format.sql</span></td>
        <td><span class="mono">260316-001</span></td>
      </tr>
      <tr>
        <td>Düzeltici Faaliyet (CA)</td>
        <td>ca_number sütunu mevcut</td>
        <td>Muhtemelen trigger veya DB default</td>
        <td>—</td>
      </tr>
      <tr>
        <td>Müşteri Anketi Token</td>
        <td>UUID</td>
        <td>Frontend — <span class="mono">CustomerSurveyModal.tsx</span><br><span class="mono">crypto.randomUUID()</span></td>
        <td><span class="mono">550e8400-e29b-41d4-a716-...</span></td>
      </tr>
      <tr>
        <td>İmza Kayıtları</td>
        <td>UUID</td>
        <td>Supabase — <span class="mono">gen_random_uuid()</span></td>
        <td>—</td>
      </tr>
      <tr>
        <td>Tüm diğer kayıtlar</td>
        <td>UUID</td>
        <td>Supabase — <span class="mono">gen_random_uuid()</span></td>
        <td>—</td>
      </tr>
    </tbody>
  </table>
  <div class="callout callout-yellow">
    <strong>Not:</strong> NC numarası için önceki trigger <span class="mono">20260321125941_drop_old_nc_number_trigger_and_fix_records.sql</span> ile kaldırılmış, yeni format aynı migration'da tanımlanmış.
  </div>
</div>

<!-- ======================== SECTION 8 ======================== -->
<div class="section">
  <div class="section-header">
    <div class="section-num">8</div>
    <h2>AI Entegrasyonu</h2>
  </div>

  <h3>Edge Functions</h3>
  <table>
    <thead><tr><th>Function</th><th>Amaç</th><th>Çağıran Bileşen</th><th>Model</th></tr></thead>
    <tbody>
      <tr><td><span class="mono">five-why-ai</span></td><td>İteratif 5-Neden sorusu üretimi</td><td><span class="mono">NonconformityDetailDrawer.tsx</span></td><td><span class="mono">claude-sonnet-4-6</span></td></tr>
      <tr><td><span class="mono">ai-proxy</span></td><td>Genel AI proxy (five-why-ai ile özdeş)</td><td><span class="mono">FiveWhyInterface.tsx</span></td><td><span class="mono">claude-sonnet-4-6</span></td></tr>
    </tbody>
  </table>

  <h3>AI Destekli Özellikler</h3>
  <table>
    <thead><tr><th>Özellik</th><th>Akış</th><th>Çıktı</th></tr></thead>
    <tbody>
      <tr>
        <td><strong>5-Neden Analizi</strong></td>
        <td>Kullanıcı NC tanımı girer → AI sırayla "Neden?" soruları sorar → Kök neden özetler</td>
        <td>Kök neden metni + DF önerisi → <span class="mono">nonconformity_root_causes</span>'a kaydedilir</td>
      </tr>
      <tr>
        <td><strong>Fishbone DF Önerisi</strong></td>
        <td>Fishbone kök nedenler listelendikten sonra tek seferde AI DF önerisi üretir</td>
        <td>DF öneri metni → <span class="mono">nonconformities.df_suggestion</span>'a kaydedilir</td>
      </tr>
    </tbody>
  </table>

  <h3>AI Çağrı Mimarisi</h3>
  <pre>Frontend (fetch)
  → Supabase Edge Function
      Authorization: Bearer &lt;ANON_KEY&gt;
    → Anthropic API
        model: claude-sonnet-4-6
        max_tokens: 1024
      → Yanıt Edge Function'a döner
        → Frontend'e iletilir</pre>
  <div class="callout callout-green">
    <strong>Güvenli:</strong> ANTHROPIC_API_KEY hiçbir zaman frontend'e expose edilmiyor. Tüm AI çağrıları edge function üzerinden geçiyor.
  </div>
  <div class="callout callout-red">
    <strong>Sorun:</strong> <span class="mono">ai-proxy</span> ve <span class="mono">five-why-ai</span> edge function'ları neredeyse özdeş. Biri gereksiz. Hangisinin kullanıldığı test edilmeli, kullanılmayan kaldırılmalı.
  </div>
</div>

<!-- ======================== SECTION 9 ======================== -->
<div class="section">
  <div class="section-header">
    <div class="section-num">9</div>
    <h2>Güvenlik Sorunları</h2>
  </div>

  <h3>Yüksek Öncelikli</h3>
  <table>
    <thead><tr><th>#</th><th>Sorun</th><th>Konum</th><th>Önerilen Çözüm</th></tr></thead>
    <tbody>
      <tr>
        <td>1</td>
        <td><strong>Hardcoded email erişim kontrolü</strong><br>Not defteri erişimi 2 e-posta adresine göre sabit kodlanmış</td>
        <td><span class="mono">App.tsx:96-97</span><br><span class="mono">Sidebar.tsx:34</span></td>
        <td><span class="mono">profiles</span> tablosuna <span class="mono">feature_notepad boolean DEFAULT false</span> kolonu ekle</td>
      </tr>
      <tr>
        <td>2</td>
        <td><strong>Açık kayıt</strong><br>gmail.com adresiyle herkes kayıt olabiliyor</td>
        <td><span class="mono">Login.tsx:27-29</span></td>
        <td>Invite-only sistem veya <span class="mono">profiles.approved boolean</span> ile yönetici onayı</td>
      </tr>
    </tbody>
  </table>

  <h3>Orta Öncelikli</h3>
  <table>
    <thead><tr><th>#</th><th>Sorun</th><th>Konum</th><th>Önerilen Çözüm</th></tr></thead>
    <tbody>
      <tr>
        <td>3</td>
        <td><strong>onboarding@resend.dev test gönderici</strong></td>
        <td><span class="mono">send-signature-notification:124</span></td>
        <td>Özel domain kur, <span class="mono">noreply@[domain]</span> kullan</td>
      </tr>
      <tr>
        <td>4</td>
        <td><strong>AI prompt injection riski</strong><br>NC açıklaması sanitasyon olmadan prompt'a ekleniyor</td>
        <td><span class="mono">FiveWhyInterface.tsx</span><br><span class="mono">NonconformityDetailDrawer.tsx</span></td>
        <td>Kullanıcı girdisini XML/HTML tag'larından arındır, uzunluk sınırla</td>
      </tr>
      <tr>
        <td>5</td>
        <td><strong>console.log prod güvenliği</strong><br>Rol, kullanıcı ID, session bilgisi konsolda görünüyor</td>
        <td><span class="mono">AuthContext.tsx</span> (~20 satır)</td>
        <td>Tüm log'ları kaldır veya <span class="mono">vite.config.ts</span>'e <span class="mono">esbuild.drop: ['console']</span> ekle</td>
      </tr>
    </tbody>
  </table>
</div>

<!-- ======================== SECTION 10 ======================== -->
<div class="section">
  <div class="section-header">
    <div class="section-num">10</div>
    <h2>Sıralanmış Yapılacaklar Listesi</h2>
  </div>

  <h3>Öncelik 1 — Kritik Düzeltmeler</h3>
  <div class="priority-list">
    <div class="priority-item p1">
      <div class="num">1</div>
      <div>
        <strong>AuthContext.tsx — tüm console.log'ları kaldır</strong>
        <div class="detail">~20 satır var. Role/session/userId bilgisi tarayıcı konsoluna yazılıyor. Production güvenlik riski.</div>
      </div>
    </div>
    <div class="priority-item p1">
      <div class="num">2</div>
      <div>
        <strong>Hardcoded email erişimini kaldır</strong>
        <div class="detail">App.tsx:96-97 ve Sidebar.tsx:34. profiles tablosuna feature_notepad boolean kolonu ekle. E-posta değişirse 2 yerde güncelleme gerekiyor şu an.</div>
      </div>
    </div>
    <div class="priority-item p1">
      <div class="num">3</div>
      <div>
        <strong>Kayıt kısıtlaması</strong>
        <div class="detail">Login.tsx — gmail.com herkese açık. profiles.approved boolean + yönetici onayı sistemi veya invite-only akış kur.</div>
      </div>
    </div>
    <div class="priority-item p1">
      <div class="num">4</div>
      <div>
        <strong>onboarding@resend.dev → özel domain</strong>
        <div class="detail">send-signature-notification edge function satır 124. Resend test adresi production'da kullanılıyor.</div>
      </div>
    </div>
    <div class="priority-item p1">
      <div class="num">5</div>
      <div>
        <strong>ai-proxy / five-why-ai duplicate kaldır</strong>
        <div class="detail">İki edge function özdeş. FiveWhyInterface.tsx ve NonconformityDetailDrawer.tsx'in hangisini çağırdığını doğrula, kullanılmayanı sil.</div>
      </div>
    </div>
  </div>

  <h3>Öncelik 2 — Eksik Core Özellikler</h3>
  <div class="priority-list">
    <div class="priority-item p2">
      <div class="num">6</div>
      <div>
        <strong>Tarayıcı geri tuşunu düzelt</strong>
        <div class="detail">App.tsx'e window.addEventListener('popstate', handler) ekle. URL değişikliklerini dinle ve activeModule state'ini güncelle.</div>
      </div>
    </div>
    <div class="priority-item p2">
      <div class="num">7</div>
      <div>
        <strong>Laboratuvar Operasyonları şemaları</strong>
        <div class="detail">7 tablo için migration yaz. ModuleView'e modüle özel kolon konfigürasyonu ekle. En az: methods_scope, incoming_devices, technical_records öncelikli.</div>
      </div>
    </div>
    <div class="priority-item p2">
      <div class="num">8</div>
      <div>
        <strong>process_performance ve facilities_environment modülleri</strong>
        <div class="detail">Tablo şemaları + ModuleView kolon tanımları gerekiyor.</div>
      </div>
    </div>
    <div class="priority-item p2">
      <div class="num">9</div>
      <div>
        <strong>Tedarikçi değerlendirme ve satın alma</strong>
        <div class="detail">SupplierDetailView.tsx'te purchase_orders ve supplier_evaluations tablolarını bağla. Migration 20260314205923'te tablolar hazır.</div>
      </div>
    </div>
    <div class="priority-item p2">
      <div class="num">10</div>
      <div>
        <strong>İç Tetkik → Uygunsuzluk bağlantısı</strong>
        <div class="detail">internal_audit_nonconformities'den nonconformities tablosuna referans ekle. NonconformitiesView'de "kaynak: iç tetkik" filtresi çalıştır.</div>
      </div>
    </div>
    <div class="priority-item p2">
      <div class="num">11</div>
      <div>
        <strong>Anket soruları dinamikleştir</strong>
        <div class="detail">customer_surveys tablosuna questions jsonb kolonu ekle veya ayrı survey_templates tablosu kur. CustomerSurveyView ve CustomerSurveyModal'daki hardcoded sorular kaldırılmalı.</div>
      </div>
    </div>
  </div>

  <h3>Öncelik 3 — İyileştirmeler</h3>
  <div class="priority-list">
    <div class="priority-item p3">
      <div class="num">12</div>
      <div>
        <strong>isManager kontrolünü merkezi hale getir</strong>
        <div class="detail">AuthContext'e isManager: boolean ekle. ~10 bileşendeki role === 'admin' || ... kontrollerini değiştir.</div>
      </div>
    </div>
    <div class="priority-item p3">
      <div class="num">13</div>
      <div>
        <strong>Deadline sorgusunu tek yere taşı</strong>
        <div class="detail">ComplianceContext, ActionTracking ve UrgentDeadlinesModal aynı sorguyu çalıştırıyor. ComplianceContext'e urgentItems: Item[] ekle.</div>
      </div>
    </div>
    <div class="priority-item p3">
      <div class="num">14</div>
      <div>
        <strong>ActionTracking.tsx'teki 6 console.log'u kaldır</strong>
        <div class="detail">En fazla log içeren bileşen. Tümü kaldırılabilir.</div>
      </div>
    </div>
    <div class="priority-item p3">
      <div class="num">15</div>
      <div>
        <strong>Anket soruları duplicate</strong>
        <div class="detail">src/config/surveyQuestions.ts dosyası oluştur. CustomerSurveyView ve CustomerSurveyModal bu dosyadan import etsin.</div>
      </div>
    </div>
    <div class="priority-item p3">
      <div class="num">16</div>
      <div>
        <strong>ISO maddeleri ve YGG gündemleri yapılandırılabilir</strong>
        <div class="detail">AuditPlanModal ve ManagementReviewDetailView'deki hardcoded listeleri src/config/ altına taşı.</div>
      </div>
    </div>
    <div class="priority-item p3">
      <div class="num">17</div>
      <div>
        <strong>Vite build'de console'u düşür</strong>
        <div class="detail">vite.config.ts'e esbuild: { drop: ['console', 'debugger'] } ekle. Production build'de ~50 log otomatik kaldırılır.</div>
      </div>
    </div>
    <div class="priority-item p3">
      <div class="num">18</div>
      <div>
        <strong>PDF doküman kodlarını yapılandırılabilir hale getir</strong>
        <div class="detail">FR.14, FR.13, FR-12 değerleri PDF utility'lerinde hardcoded. document_master_list tablosundan veya src/config/documentCodes.ts'ten çek.</div>
      </div>
    </div>
    <div class="priority-item p3">
      <div class="num">19</div>
      <div>
        <strong>supabase.ts:10 — başlangıç log'unu kaldır</strong>
        <div class="detail">"Supabase initialized with URL:" log'u her yüklemede konsolda görünüyor.</div>
      </div>
    </div>
  </div>
</div>

<div style="margin-top:48px; padding:20px 0; border-top:1px solid #e5e7eb; text-align:center; font-size:11px; color:#9ca3af;">
  Bu rapor Claude Sonnet 4.6 tarafından ${reportDate} tarihinde projedeki tüm .tsx, .ts ve migration dosyaları analiz edilerek otomatik oluşturulmuştur.
  Toplam analiz edilen dosya: ~110 (47 kaynak + 63 migration).
</div>

</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `teknik-durum-raporu-${new Date().toISOString().slice(0, 10)}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
