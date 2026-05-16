// Category Mapping Configuration
// Maps Developer 1's category slugs to our contract category IDs
// UUIDs will be fetched dynamically from /categories endpoint

export interface CategoryMapping {
  slug: string;
  uuid?: string; // Fetched from /categories endpoint
  contractId: number; // Smart contract category ID
}

export const CATEGORY_MAPPINGS: CategoryMapping[] = [
  { slug: 'elektronik', contractId: 1 },
  { slug: 'giyim', contractId: 2 },
  { slug: 'ev-yasam', contractId: 3 },
  { slug: 'spor', contractId: 4 },
  { slug: 'kitap', contractId: 5 },
];

export function getContractIdBySlug(slug: string): number | undefined {
  const mapping = CATEGORY_MAPPINGS.find((m) => m.slug === slug);
  return mapping?.contractId;
}

export function getContractIdByUuid(uuid: string): number | undefined {
  const mapping = CATEGORY_MAPPINGS.find((m) => m.uuid === uuid);
  return mapping?.contractId;
}

export function getSlugByContractId(contractId: number): string | undefined {
  const mapping = CATEGORY_MAPPINGS.find((m) => m.contractId === contractId);
  return mapping?.slug;
}

export function getUuidByContractId(contractId: number): string | undefined {
  const mapping = CATEGORY_MAPPINGS.find((m) => m.contractId === contractId);
  return mapping?.uuid;
}
