import type { ProductOptionGroup, SelectedProductOption } from '../types';

const MAX_OPTION_GROUPS = 10;
const MAX_VALUES_PER_GROUP = 100;
const MAX_LABEL_LENGTH = 60;
const MAX_VALUE_LENGTH = 100;

export function normalizeProductOptionGroups(
  groups: unknown,
  legacyLabel: unknown = '',
  legacyValues: unknown = []
): ProductOptionGroup[] {
  const input = Array.isArray(groups) ? groups : [];
  const normalized = normalizeGroups(input);
  if (normalized.length) return normalized;

  const label = cleanText(legacyLabel, MAX_LABEL_LENGTH);
  const values = normalizeValues(legacyValues);
  return label && values.length ? [{ label, values }] : [];
}

export function normalizeSelectedProductOptions(
  selections: unknown,
  legacyLabel: unknown = '',
  legacyValue: unknown = ''
): SelectedProductOption[] {
  const normalized: SelectedProductOption[] = [];
  const seen = new Set<string>();

  if (Array.isArray(selections)) {
    for (const entry of selections) {
      if (!entry || typeof entry !== 'object') continue;
      const value = entry as Record<string, unknown>;
      const label = cleanText(value.label, MAX_LABEL_LENGTH);
      const selectedValue = cleanText(value.value, MAX_VALUE_LENGTH);
      const key = label.toLocaleLowerCase();
      if (!label || !selectedValue || seen.has(key)) continue;
      seen.add(key);
      normalized.push({ label, value: selectedValue });
      if (normalized.length >= MAX_OPTION_GROUPS) break;
    }
  }

  if (normalized.length) return normalized;

  const label = cleanText(legacyLabel, MAX_LABEL_LENGTH);
  const value = cleanText(legacyValue, MAX_VALUE_LENGTH);
  return label && value ? [{ label, value }] : [];
}

export function areProductSelectionsValid(
  groups: ProductOptionGroup[],
  selections: SelectedProductOption[]
) {
  const normalizedGroups = normalizeProductOptionGroups(groups);
  const normalizedSelections = normalizeSelectedProductOptions(selections);
  if (!normalizedGroups.length) return normalizedSelections.length === 0;
  if (normalizedSelections.length !== normalizedGroups.length) return false;

  return normalizedGroups.every((group) => {
    const selection = normalizedSelections.find(
      (item) => item.label.toLocaleLowerCase() === group.label.toLocaleLowerCase()
    );
    return Boolean(selection && group.values.includes(selection.value));
  });
}

export function optionGroupsEqual(first: unknown, second: unknown) {
  return JSON.stringify(normalizeProductOptionGroups(first)) === JSON.stringify(normalizeProductOptionGroups(second));
}

export function parseOptionValues(value: unknown) {
  return normalizeValues(value);
}

function normalizeGroups(input: unknown[]) {
  const groups: ProductOptionGroup[] = [];
  const groupIndexes = new Map<string, number>();

  for (const entry of input) {
    if (!entry || typeof entry !== 'object') continue;
    const raw = entry as Record<string, unknown>;
    const label = cleanText(raw.label ?? raw.name, MAX_LABEL_LENGTH);
    const values = normalizeValues(raw.values ?? raw.options);
    if (!label || !values.length) continue;

    const key = label.toLocaleLowerCase();
    const existingIndex = groupIndexes.get(key);
    if (existingIndex !== undefined) {
      groups[existingIndex] = {
        ...groups[existingIndex],
        values: normalizeValues([...groups[existingIndex].values, ...values])
      };
      continue;
    }

    groupIndexes.set(key, groups.length);
    groups.push({ label, values });
    if (groups.length >= MAX_OPTION_GROUPS) break;
  }

  return groups;
}

function normalizeValues(value: unknown) {
  const input = Array.isArray(value) ? value : String(value || '').split(/[,\n]/);
  const values: string[] = [];
  const seen = new Set<string>();

  for (const entry of input) {
    const cleaned = cleanText(entry, MAX_VALUE_LENGTH);
    const key = cleaned.toLocaleLowerCase();
    if (!cleaned || seen.has(key)) continue;
    seen.add(key);
    values.push(cleaned);
    if (values.length >= MAX_VALUES_PER_GROUP) break;
  }

  return values;
}

function cleanText(value: unknown, maxLength: number) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}
