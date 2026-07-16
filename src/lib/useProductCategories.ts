'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import {
  DEFAULT_PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_NAME_MAX_LENGTH,
  mergeProductCategoryNames,
  normalizeProductCategoryName,
  productCategoryKey
} from './categories';

export type ProductCategoryRecord = {
  key: string;
  name: string;
  createdAt: string | null;
  persisted: boolean;
};

type CategoryRow = {
  key?: unknown;
  name?: unknown;
  created_at?: unknown;
};

export const CATEGORY_SCHEMA_MIGRATION_MESSAGE =
  'Category management is not enabled in Supabase yet. Run the latest database.sql in the Supabase SQL Editor, then try again.';

const DEFAULT_CATEGORY_RECORDS = recordsFromNames(DEFAULT_PRODUCT_CATEGORIES);

export function useProductCategories({ enabled = true }: { enabled?: boolean } = {}) {
  const [categories, setCategories] = useState<ProductCategoryRecord[]>(DEFAULT_CATEGORY_RECORDS);
  const [loading, setLoading] = useState(enabled);
  const [schemaAvailable, setSchemaAvailable] = useState<boolean | null>(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError('');

    async function loadCategories() {
      const { data, error } = await supabase
        .from('categories')
        .select('key,name,created_at')
        .order('name', { ascending: true });

      if (cancelled) return;

      if (error) {
        const missingSchema = isMissingCategoriesSchema(error);
        setCategories(DEFAULT_CATEGORY_RECORDS);
        setSchemaAvailable(missingSchema ? false : null);
        setLoadError(missingSchema ? CATEGORY_SCHEMA_MIGRATION_MESSAGE : error.message || 'Could not load categories.');
        setLoading(false);
        return;
      }

      const databaseRecords = (data || [])
        .map(categoryRecordFromRow)
        .filter((category): category is ProductCategoryRecord => Boolean(category));
      setCategories(mergeCategoryRecords(DEFAULT_CATEGORY_RECORDS, databaseRecords));
      setSchemaAvailable(true);
      setLoading(false);
    }

    void loadCategories();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const createCategory = useCallback(async (value: string) => {
    const name = normalizeProductCategoryName(value);
    const key = productCategoryKey(name);

    if (!name) throw new Error('Enter a category name.');
    if (name.length > PRODUCT_CATEGORY_NAME_MAX_LENGTH) {
      throw new Error(`Category names must be ${PRODUCT_CATEGORY_NAME_MAX_LENGTH} characters or fewer.`);
    }
    if (categories.some((category) => category.key === key)) {
      throw new Error(`The category "${name}" already exists.`);
    }

    const { data, error } = await supabase
      .from('categories')
      .insert({ key, name })
      .select('key,name,created_at')
      .single();

    if (error) {
      if (isMissingCategoriesSchema(error)) {
        setSchemaAvailable(false);
        setLoadError(CATEGORY_SCHEMA_MIGRATION_MESSAGE);
        throw new Error(CATEGORY_SCHEMA_MIGRATION_MESSAGE);
      }
      if (String(error.code || '') === '23505') throw new Error(`The category "${name}" already exists.`);
      throw new Error(error.message || 'Could not create that category.');
    }

    const created = categoryRecordFromRow(data);
    if (!created) throw new Error('The category was saved but could not be loaded. Refresh and try again.');

    setCategories((current) => mergeCategoryRecords(current, [created]));
    setSchemaAvailable(true);
    setLoadError('');
    return created;
  }, [categories]);

  return { categories, loading, schemaAvailable, loadError, createCategory };
}

function recordsFromNames(names: ReadonlyArray<string>) {
  return mergeProductCategoryNames(names).map<ProductCategoryRecord>((name) => ({
    key: productCategoryKey(name),
    name,
    createdAt: null,
    persisted: false
  }));
}

function categoryRecordFromRow(row: CategoryRow | null): ProductCategoryRecord | null {
  const name = normalizeProductCategoryName(row?.name);
  const key = productCategoryKey(row?.key || name);
  if (!name || !key) return null;

  return {
    key,
    name,
    createdAt: typeof row?.created_at === 'string' ? row.created_at : null,
    persisted: true
  };
}

function mergeCategoryRecords(...collections: ReadonlyArray<ReadonlyArray<ProductCategoryRecord>>) {
  const records = new Map<string, ProductCategoryRecord>();

  for (const collection of collections) {
    for (const category of collection) {
      const existing = records.get(category.key);
      if (!existing || category.persisted) records.set(category.key, category);
    }
  }

  return Array.from(records.values()).sort((first, second) => first.name.localeCompare(second.name));
}

function isMissingCategoriesSchema(error: { code?: string; message?: string; details?: string }) {
  const code = String(error.code || '').toUpperCase();
  const message = `${error.message || ''} ${error.details || ''}`.toLowerCase();
  return code === '42P01' || code === 'PGRST205' || (
    message.includes('categories') && (
      message.includes('does not exist') ||
      message.includes('schema cache') ||
      message.includes('could not find the table')
    )
  );
}
