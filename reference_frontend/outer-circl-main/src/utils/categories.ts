export interface CategoryOption {
  id: string;
  label: string;
}

export const CATEGORY_OPTIONS: CategoryOption[] = [
  { id: 'social', label: 'Social' },
  { id: 'education', label: 'Education' },
  { id: 'sports', label: 'Sports & Fitness' },
  { id: 'arts', label: 'Arts & Culture' },
  { id: 'technology', label: 'Technology' },
  { id: 'food', label: 'Food & Drinks' },
  { id: 'health-wellness', label: 'Health & Wellness' },
  { id: 'outdoors', label: 'Outdoors' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'giving-back', label: 'Giving Back' },
  { id: 'other', label: 'Other' },
];

export const getCategoryLabel = (categoryId: string): string => {
  const category = CATEGORY_OPTIONS.find(cat => cat.id === categoryId);
  return category?.label || categoryId;
};

export const getAllCategoryIds = (): string[] => {
  return CATEGORY_OPTIONS.map(cat => cat.id);
};