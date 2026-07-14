import { supabase } from './client';

export type DriverLicenseStatus = 'pending' | 'verified' | 'rejected' | 'expired';

export type DriverLicenseRow = {
  id: string;
  company_id: string;
  customer_id: string;
  license_number: string;
  issue_date: string | null;
  expiry_date: string;
  issuing_country: string;
  front_image_url: string | null;
  back_image_url: string | null;
  verification_status: DriverLicenseStatus;
  verified_by: string | null;
  verified_at: string | null;
  verification_notes: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

export type DriverLicenseInsert = {
  id?: string;
  company_id: string;
  customer_id: string;
  license_number: string;
  issue_date?: string | null;
  expiry_date: string;
  issuing_country?: string;
  front_image_url?: string | null;
  back_image_url?: string | null;
  verification_status?: DriverLicenseStatus;
  verified_by?: string | null;
  verified_at?: string | null;
  verification_notes?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  created_by?: string | null;
};

export type DriverLicenseUpdate = Partial<DriverLicenseInsert>;

type DriverLicenseQueryError = {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
};

type DriverLicenseQueryResult<TResult> =
  | { data: TResult; error: null; count: number | null }
  | { data: null; error: DriverLicenseQueryError; count: null };

interface DriverLicenseQuery<TResult> extends PromiseLike<DriverLicenseQueryResult<TResult>> {
  select(
    columns?: string,
    options?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }
  ): DriverLicenseQuery<DriverLicenseRow[]>;
  insert(values: DriverLicenseInsert | DriverLicenseInsert[]): DriverLicenseQuery<null>;
  update(values: DriverLicenseUpdate): DriverLicenseQuery<null>;
  delete(): DriverLicenseQuery<null>;
  eq(column: keyof DriverLicenseRow, value: unknown): DriverLicenseQuery<TResult>;
  gte(column: keyof DriverLicenseRow, value: unknown): DriverLicenseQuery<TResult>;
  lte(column: keyof DriverLicenseRow, value: unknown): DriverLicenseQuery<TResult>;
  order(
    column: keyof DriverLicenseRow,
    options?: { ascending?: boolean }
  ): DriverLicenseQuery<TResult>;
  single(): DriverLicenseQuery<DriverLicenseRow>;
};

// The checked-in generated types predate this migration. Keeping the narrow
// schema here avoids widening every Supabase query in the application.
export const driverLicensesTable = () =>
  (supabase.from as unknown as (relation: string) => DriverLicenseQuery<DriverLicenseRow[]>)(
    'driver_licenses'
  );
