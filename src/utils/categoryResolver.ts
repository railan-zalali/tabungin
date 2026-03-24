import {
  ALL_CATEGORIES,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  type CategoryItem,
} from '../constants/categories';
import type { CategoryType, TransactionCategory } from '../database/categoryQueries';
import { resolveMaterialIcon } from './materialIcon';

export interface ResolvedCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: CategoryType;
  is_default?: boolean;
}

function normalizeStoredCategory(category: TransactionCategory): ResolvedCategory {
  return {
    id: category.id,
    name: category.name,
    icon: resolveMaterialIcon(category.icon),
    color: category.color,
    type: category.type,
    is_default: category.is_default,
  };
}

function normalizeLegacyCategory(category: CategoryItem): ResolvedCategory {
  return {
    ...category,
    icon: resolveMaterialIcon(category.icon),
    is_default: true,
  };
}

export function resolveCategoriesForType(
  type: 'income' | 'expense',
  storedCategories: TransactionCategory[] = [],
): ResolvedCategory[] {
  const fallbackCategories = (type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES)
    .map(normalizeLegacyCategory);

  const mergedCategories = [...fallbackCategories];
  const availableStoredCategories = storedCategories
    .filter((category) => category.type === type || category.type === 'both')
    .map(normalizeStoredCategory);

  for (const category of availableStoredCategories) {
    const existingIndex = mergedCategories.findIndex((currentCategory) =>
      currentCategory.id === category.id
      || (
        currentCategory.type === category.type
        && currentCategory.name.trim().toLowerCase() === category.name.trim().toLowerCase()
      ),
    );

    if (existingIndex >= 0) {
      mergedCategories[existingIndex] = category;
    } else {
      mergedCategories.push(category);
    }
  }

  return mergedCategories.sort((left, right) => {
    if (Boolean(left.is_default) !== Boolean(right.is_default)) {
      return left.is_default ? -1 : 1;
    }

    return left.name.localeCompare(right.name, 'id');
  });
}

export function resolveCategoryByKey(
  key: string,
  storedCategories: TransactionCategory[] = [],
): ResolvedCategory | undefined {
  const storedById = storedCategories.find((category) => category.id === key);
  if (storedById) {
    return normalizeStoredCategory(storedById);
  }

  const legacyById = ALL_CATEGORIES.find((category) => category.id === key);
  if (legacyById) {
    return normalizeLegacyCategory(legacyById);
  }

  const normalizedKey = key.trim().toLowerCase();
  const storedByName = storedCategories.find(
    (category) => category.name.trim().toLowerCase() === normalizedKey,
  );

  if (storedByName) {
    return normalizeStoredCategory(storedByName);
  }

  const legacyByName = ALL_CATEGORIES.find(
    (category) => category.name.trim().toLowerCase() === normalizedKey,
  );

  if (legacyByName) {
    return normalizeLegacyCategory(legacyByName);
  }

  return undefined;
}
