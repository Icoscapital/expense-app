import { ExpenseCategory } from '../types';

export interface CategoryMeta {
  label: string;
  icon: string; // emoji icon for simple display
  color: string;
}

export const CATEGORIES: Record<ExpenseCategory, CategoryMeta> = {
  meals: {
    label: 'Meals & Food',
    icon: '🍽️',
    color: '#F59E0B',
  },
  travel: {
    label: 'Travel',
    icon: '✈️',
    color: '#3B82F6',
  },
  accommodation: {
    label: 'Accommodation',
    icon: '🏨',
    color: '#8B5CF6',
  },
  software: {
    label: 'Software & Tools',
    icon: '💻',
    color: '#10B981',
  },
  office_supplies: {
    label: 'Office Supplies',
    icon: '📎',
    color: '#6B7280',
  },
  entertainment: {
    label: 'Entertainment',
    icon: '🎭',
    color: '#EF4444',
  },
  other: {
    label: 'Other',
    icon: '📋',
    color: '#9CA3AF',
  },
};

export const CATEGORY_OPTIONS = (Object.keys(CATEGORIES) as ExpenseCategory[]).map(
  (key) => ({
    value: key,
    ...CATEGORIES[key],
  })
);
