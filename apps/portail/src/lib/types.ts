export interface PortalBeneficiary {
  id: string;
  immuniqId: string;
  firstName: string;
  lastName: string;
  birthDate?: string;
  sex?: string;
  phone?: string;
  commune?: string;
  status?: string;
}

export interface PortalItem {
  beneficiary: PortalBeneficiary;
  relation: 'self' | 'guardian';
}

export interface VaccineRef {
  id: string;
  code?: string;
  name?: string;
}

export interface VaccinationAct {
  id: string;
  doseNumber?: number;
  status?: string;
  administeredAt?: string;
  vaccine?: VaccineRef;
  vaccineId?: string;
  lotNumber?: string;
  site?: string;
  structure?: { name?: string };
}

export interface ScheduleDose {
  rule: { doseNumber: number; minAgeDays?: number; maxAgeDays?: number };
  status: 'completed' | 'due' | 'upcoming' | 'overdue' | 'unknown_age';
  eligibleAt?: string;
  deadlineAt?: string;
  act?: VaccinationAct;
}

export interface ScheduleVaccine {
  vaccine: VaccineRef;
  doses: ScheduleDose[];
  status: string;
  nextDueAt?: string;
}

export interface PortalRecord {
  beneficiary: PortalBeneficiary;
  acts: VaccinationAct[];
  schedule: { referential?: { code?: string; version?: number } | null; vaccines: ScheduleVaccine[] };
  attestations: {
    id: string;
    reference: string;
    status: string;
    issuedAt: string;
    content?: Record<string, unknown>;
  }[];
  generatedAt: string;
}

export interface PortalPreference {
  id: string;
  beneficiaryId: string;
  channel: 'sms' | 'push' | 'portal' | 'email';
  optedIn: boolean;
  phoneOverride?: string;
}

export interface PortalNotification {
  id: string;
  channel: string;
  status: string;
  scheduledAt?: string;
  sentAt?: string;
  deliveredAt?: string;
  createdAt: string;
  payload?: Record<string, unknown>;
}
