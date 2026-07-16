'use client';

import type { ProductOptionGroup, SelectedProductOption } from '../../types';
import {
  normalizeProductOptionGroups,
  normalizeSelectedProductOptions,
  parseOptionValues
} from '../../lib/productOptions';

const MAX_OPTION_GROUPS = 10;

export type ProductOptionGroupDraft = {
  label: string;
  values: string;
};

type ProductOptionGroupsEditorProps = {
  groups: ProductOptionGroupDraft[];
  onChange: (groups: ProductOptionGroupDraft[]) => void;
  disabled?: boolean;
};

export function createProductOptionGroupDrafts(
  groups: unknown,
  legacyLabel: unknown = '',
  legacyValues: unknown = []
): ProductOptionGroupDraft[] {
  return normalizeProductOptionGroups(groups, legacyLabel, legacyValues).map((group) => ({
    label: group.label,
    values: group.values.join(', ')
  }));
}

export function parseProductOptionGroupDrafts(groups: ProductOptionGroupDraft[]) {
  const completeGroups: ProductOptionGroup[] = [];
  const labels = new Set<string>();

  for (const group of groups) {
    const label = String(group?.label || '').replace(/\s+/g, ' ').trim();
    const values = parseOptionValues(group?.values);

    if (!label && !values.length) continue;
    if (!label || !values.length) {
      return {
        groups: [] as ProductOptionGroup[],
        error: 'Each choice group needs a name and at least one available choice.'
      };
    }

    const key = label.toLocaleLowerCase();
    if (labels.has(key)) {
      return {
        groups: [] as ProductOptionGroup[],
        error: `Choice group names must be unique. "${label}" is used more than once.`
      };
    }

    labels.add(key);
    completeGroups.push({ label, values });
  }

  return {
    groups: normalizeProductOptionGroups(completeGroups),
    error: ''
  };
}

export function ProductOptionGroupsEditor({ groups, onChange, disabled = false }: ProductOptionGroupsEditorProps) {
  const updateGroup = (index: number, key: keyof ProductOptionGroupDraft, value: string) => {
    onChange(groups.map((group, groupIndex) => groupIndex === index ? { ...group, [key]: value } : group));
  };

  return (
    <div className="form-group full" style={{ display: 'grid', gap: '12px' }}>
      <div>
        <span className="form-label">Product choices (optional)</span>
        <span className="form-help">Add separate groups when buyers must choose more than one detail, such as both Size and Color.</span>
      </div>

      {groups.map((group, index) => (
        <div
          key={index}
          style={{ display: 'grid', gap: '10px', padding: '14px', border: '1px solid var(--dashboard-border)', borderRadius: '12px', background: '#fbfafe' }}
        >
          <div className="form-grid">
            <label className="form-group">
              <span className="form-label">Choice group {index + 1}</span>
              <input
                className="form-control"
                value={group.label}
                onChange={(event) => updateGroup(index, 'label', event.target.value)}
                disabled={disabled}
                maxLength={60}
                placeholder={index === 0 ? 'Size' : 'Color'}
              />
            </label>
            <label className="form-group">
              <span className="form-label">Available choices</span>
              <textarea
                className="form-control"
                value={group.values}
                onChange={(event) => updateGroup(index, 'values', event.target.value)}
                disabled={disabled}
                maxLength={4000}
                placeholder={index === 0 ? 'S, M, L, XL' : 'Black, Blue, Red'}
              />
              <span className="form-help">Separate choices with commas or new lines.</span>
            </label>
          </div>
          <div>
            <button
              className="btn-dashboard btn-dashboard-secondary"
              type="button"
              onClick={() => onChange(groups.filter((_, groupIndex) => groupIndex !== index))}
              disabled={disabled}
            >
              Remove group
            </button>
          </div>
        </div>
      ))}

      <div>
        <button
          className="btn-dashboard btn-dashboard-secondary"
          type="button"
          onClick={() => onChange([...groups, { label: '', values: '' }])}
          disabled={disabled || groups.length >= MAX_OPTION_GROUPS}
        >
          + Add choice group
        </button>
      </div>
    </div>
  );
}

export function SelectedProductOptionsSummary({
  selections,
  legacyLabel = '',
  legacyValue = ''
}: {
  selections: unknown;
  legacyLabel?: unknown;
  legacyValue?: unknown;
}) {
  const selectedOptions = normalizeSelectedProductOptions(selections, legacyLabel, legacyValue);
  if (!selectedOptions.length) return null;

  return (
    <span className="cell-meta">
      {formatSelectedProductOptions(selectedOptions)}
    </span>
  );
}

function formatSelectedProductOptions(selections: SelectedProductOption[]) {
  return selections.map((selection) => `${selection.label}: ${selection.value}`).join(' | ');
}
