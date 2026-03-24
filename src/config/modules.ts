import { Microscope, FileText, File as FileEdit, Scale, ClipboardList, FileCheck, TestTube, ShoppingCart, Shield, AlertTriangle, ClipboardCheck, MessageCircle, Presentation, XCircle, TrendingUp, Users, Truck, Thermometer, Wrench, FolderOpen, Building2, Target, Files, Archive, Database, BarChart3, ListOrdered, Award } from 'lucide-react';
import { Section } from '../types/modules';

export const sections: Section[] = [
  {
    id: 'laboratory',
    name: 'LABORATUVAR OPERASYONLARI',
    icon: Microscope,
    color: 'text-blue-500',
    modules: [
      {
        id: 'methods_scope',
        name: 'Metodlar / KAPSAM',
        table: 'methods_scope',
        icon: FileText,
      },
      {
        id: 'accreditation_scope',
        name: 'Akreditasyon Kapsamı',
        table: 'accreditation_scope',
        icon: Award,
      },
      {
        id: 'requests_proposals',
        name: 'Talep Teklifler Sözleşmeler',
        table: 'requests_proposals',
        icon: FileEdit,
      },
      {
        id: 'incoming_devices',
        name: 'Kalibrasyon Gelen Cihazların Yönetimi',
        table: 'incoming_devices',
        icon: Scale,
      },
      {
        id: 'technical_records',
        name: 'Teknik Kayıtlar',
        table: 'technical_records',
        icon: ClipboardList,
      },
      {
        id: 'reporting',
        name: 'Sonuçların Raporlanması',
        table: 'reporting',
        icon: FileCheck,
      },
      {
        id: 'quality_assurance',
        name: 'Sonuçların Geçerliliği (QA)',
        table: 'quality_assurance',
        icon: TestTube,
      },
      {
        id: 'external_procurement',
        name: 'Dışarıdan Tedarik Edilen Ürün/Hizmet',
        table: 'external_procurement',
        icon: ShoppingCart,
      },
    ],
  },
  {
    id: 'quality',
    name: 'KALİTE YÖNETİMİ',
    icon: Shield,
    color: 'text-green-500',
    modules: [
      {
        id: 'risks_opportunities',
        name: 'Riskler ve Fırsatlar',
        table: 'risks_opportunities',
        icon: AlertTriangle,
      },
      {
        id: 'internal_audits',
        name: 'İç Tetkikler',
        table: 'internal_audits',
        icon: ClipboardCheck,
      },
      {
        id: 'customer_feedback',
        name: 'Şikayetler, İtirazlar, Talep ve Öneriler',
        table: 'feedback_records',
        icon: MessageCircle,
      },
      {
        id: 'customer_surveys',
        name: 'Müşteri Anketleri',
        table: 'customer_surveys',
        icon: BarChart3,
      },
      {
        id: 'management_reviews',
        name: 'Yönetim Gözden Geçirme (YGG)',
        table: 'management_reviews',
        icon: Presentation,
      },
      {
        id: 'nonconformities',
        name: 'Uygunsuzluklar',
        table: 'nonconformities',
        icon: XCircle,
      },
      {
        id: 'corrective_actions',
        name: 'Düzeltici Faaliyetler',
        table: 'corrective_actions',
        icon: ClipboardCheck,
      },
      {
        id: 'process_performance',
        name: 'Proses Performansları',
        table: 'process_performance',
        icon: TrendingUp,
      },
    ],
  },
  {
    id: 'resources',
    name: 'KAYNAK YÖNETİMİ',
    icon: Users,
    color: 'text-orange-500',
    modules: [
      {
        id: 'personnel',
        name: 'Personel',
        table: 'personnel',
        icon: Users,
      },
      {
        id: 'suppliers',
        name: 'Tedarikçiler',
        table: 'suppliers',
        icon: Truck,
      },
      {
        id: 'facilities_environment',
        name: 'Tesisler ve Çevresel Koşullar',
        table: 'facilities_environment',
        icon: Thermometer,
      },
      {
        id: 'equipment_hardware',
        name: 'Donanım',
        table: 'equipment_hardware',
        icon: Wrench,
      },
    ],
  },
  {
    id: 'documentation',
    name: 'DOKÜMANTASYON',
    icon: FolderOpen,
    color: 'text-purple-500',
    modules: [
      {
        id: 'policies',
        name: 'Politika',
        table: 'policies',
        icon: Building2,
      },
      {
        id: 'objectives',
        name: 'Hedefler',
        table: 'objectives',
        icon: Target,
      },
      {
        id: 'system_documentation',
        name: 'Yönetim Sistemi Dokümantasyonu',
        table: 'system_documentation',
        icon: Files,
      },
      {
        id: 'records_control',
        name: 'Kayıtların Kontrolü',
        table: 'records_control',
        icon: Archive,
      },
      {
        id: 'data_control',
        name: 'Verilerin Kontrolü ve Bilgi Yönetimi',
        table: 'data_control',
        icon: Database,
      },
      {
        id: 'document_master_list',
        name: 'Ana Doküman Listesi',
        table: 'document_master_list',
        icon: ListOrdered,
      },
    ],
  },
];
