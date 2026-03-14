/*
  # Add Supplier Evaluations and Purchase Orders (PR01.04 - Satınalma Prosedürü Rev.04)

  ## Overview
  Extends the existing suppliers table and adds FR.08 and FR.09 form tables.

  ## Changes to suppliers table
  - Add category, status, accreditation, and evaluation summary columns if not present

  ## New Tables

  ### supplier_evaluations (FR.08 - Tedarikçi Değerlendirme Formu)
  - Periodic evaluation records linked to a supplier
  - Evaluation criteria scores and overall score
  - Evaluation date, evaluator, result (approved/conditional/rejected)

  ### purchase_orders (FR.09 - Satınalma Formu)
  - Purchase request records linked to a supplier
  - Item/service description, quantity, approval and inspection workflow
  - Status: draft / approved / ordered / received / rejected
*/

-- ========== Extend suppliers table ==========
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='supplier_no') THEN
    ALTER TABLE suppliers ADD COLUMN supplier_no text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='category') THEN
    ALTER TABLE suppliers ADD COLUMN category text NOT NULL DEFAULT 'material';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='status') THEN
    ALTER TABLE suppliers ADD COLUMN status text NOT NULL DEFAULT 'approved';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='contact_person') THEN
    ALTER TABLE suppliers ADD COLUMN contact_person text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='phone') THEN
    ALTER TABLE suppliers ADD COLUMN phone text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='email') THEN
    ALTER TABLE suppliers ADD COLUMN email text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='address') THEN
    ALTER TABLE suppliers ADD COLUMN address text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='website') THEN
    ALTER TABLE suppliers ADD COLUMN website text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='is_accredited') THEN
    ALTER TABLE suppliers ADD COLUMN is_accredited boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='accreditation_body') THEN
    ALTER TABLE suppliers ADD COLUMN accreditation_body text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='accreditation_no') THEN
    ALTER TABLE suppliers ADD COLUMN accreditation_no text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='accreditation_scope') THEN
    ALTER TABLE suppliers ADD COLUMN accreditation_scope text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='accreditation_expiry') THEN
    ALTER TABLE suppliers ADD COLUMN accreditation_expiry date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='last_evaluation_date') THEN
    ALTER TABLE suppliers ADD COLUMN last_evaluation_date date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='last_evaluation_score') THEN
    ALTER TABLE suppliers ADD COLUMN last_evaluation_score numeric(4,1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='last_evaluation_result') THEN
    ALTER TABLE suppliers ADD COLUMN last_evaluation_result text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='notes') THEN
    ALTER TABLE suppliers ADD COLUMN notes text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='warning_notes') THEN
    ALTER TABLE suppliers ADD COLUMN warning_notes text DEFAULT '';
  END IF;
END $$;

-- ========== SUPPLIER EVALUATIONS (FR.08 - Tedarikçi Değerlendirme Formu) ==========
CREATE TABLE IF NOT EXISTS supplier_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  evaluation_date date DEFAULT now(),
  evaluation_type text NOT NULL DEFAULT 'periodic' CHECK (evaluation_type IN ('initial', 'periodic', 'ad_hoc')),
  evaluator_name text DEFAULT '',
  score_quality numeric(3,1) DEFAULT 0,
  score_delivery numeric(3,1) DEFAULT 0,
  score_price numeric(3,1) DEFAULT 0,
  score_communication numeric(3,1) DEFAULT 0,
  score_documentation numeric(3,1) DEFAULT 0,
  score_accreditation numeric(3,1) DEFAULT 0,
  total_score numeric(4,1) DEFAULT 0,
  result text NOT NULL DEFAULT 'approved' CHECK (result IN ('approved', 'conditional', 'rejected')),
  strengths text DEFAULT '',
  weaknesses text DEFAULT '',
  action_taken text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE supplier_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view supplier evaluations"
  ON supplier_evaluations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert supplier evaluations"
  ON supplier_evaluations FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update supplier evaluations"
  ON supplier_evaluations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete supplier evaluations"
  ON supplier_evaluations FOR DELETE TO authenticated USING (true);

-- ========== PURCHASE ORDERS (FR.09 - Satınalma Formu) ==========
CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  order_no text NOT NULL DEFAULT '',
  order_date date DEFAULT now(),
  item_description text NOT NULL DEFAULT '',
  item_type text NOT NULL DEFAULT 'material' CHECK (item_type IN ('material', 'equipment', 'calibration', 'service', 'other')),
  quantity text DEFAULT '1',
  unit text DEFAULT '',
  special_requirements text DEFAULT '',
  requires_calibration_cert boolean DEFAULT false,
  requires_training boolean DEFAULT false,
  requested_by text DEFAULT '',
  approved_by text DEFAULT '',
  approval_date date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'ordered', 'received', 'rejected')),
  ordered_date date,
  expected_date date,
  received_date date,
  inspection_result text DEFAULT '' CHECK (inspection_result IN ('', 'pass', 'fail')),
  inspection_notes text DEFAULT '',
  inspected_by text DEFAULT '',
  inspection_date date,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view purchase orders"
  ON purchase_orders FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert purchase orders"
  ON purchase_orders FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update purchase orders"
  ON purchase_orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete purchase orders"
  ON purchase_orders FOR DELETE TO authenticated USING (true);
