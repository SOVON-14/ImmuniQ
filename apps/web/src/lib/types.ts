// Types partagés minimaux — à enrichir au fil des écrans.
// Les réponses API sont typées au plus juste ; les champs optionnels
// couvrent les variantes selon les rôles et les droits.

export interface Paginated<T> {
  items: T[];
  total: number;
  page?: number;
  pageSize?: number;
}

export interface Beneficiary {
  id: string;
  imqId?: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  sex?: string;
  phone?: string;
  status?: string;
  [key: string]: unknown;
}

export interface Vaccine {
  id: string;
  code?: string;
  name?: string;
  status?: string;
  [key: string]: unknown;
}

export interface Calendar {
  id: string;
  code?: string;
  name?: string;
  status?: string;
  version?: number;
  [key: string]: unknown;
}

export interface VaccinationAct {
  id: string;
  localId?: string;
  status?: string;
  administeredAt?: string;
  beneficiaryId?: string;
  vaccineId?: string;
  [key: string]: unknown;
}

export interface Territory {
  id: string;
  name?: string;
  code?: string;
  level?: string;
  status?: string;
  parentId?: string;
  [key: string]: unknown;
}

export interface Structure {
  id: string;
  name?: string;
  type?: string;
  territoryId?: string;
  status?: string;
  [key: string]: unknown;
}

export interface Campaign {
  id: string;
  name?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  [key: string]: unknown;
}

export interface Product {
  id: string;
  name?: string;
  code?: string;
  unit?: string;
  [key: string]: unknown;
}

export interface Lot {
  id: string;
  lotNumber?: string;
  productId?: string;
  expiryDate?: string;
  quantity?: number;
  [key: string]: unknown;
}

export interface ColdChainEquipment {
  id: string;
  name?: string;
  type?: string;
  status?: string;
  [key: string]: unknown;
}

export interface ColdChainIncident {
  id: string;
  equipmentId?: string;
  type?: string;
  severity?: string;
  status?: string;
  detectedAt?: string;
  [key: string]: unknown;
}

export interface Notification {
  id: string;
  channel?: string;
  status?: string;
  recipient?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface AuditEntry {
  id: string;
  actorId?: string;
  action?: string;
  result?: string;
  createdAt?: string;
  ip?: string;
  [key: string]: unknown;
}
