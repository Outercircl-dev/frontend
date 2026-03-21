import React, { useMemo } from 'react';

// High-order component for React.memo with custom comparison
export const withMemoization = <P extends object>(
  Component: React.ComponentType<P>,
  customCompare?: (prevProps: P, nextProps: P) => boolean
) => {
  const MemoizedComponent = React.memo(Component, customCompare);
  MemoizedComponent.displayName = `Memoized(${Component.displayName || Component.name})`;
  return MemoizedComponent;
};

// Shallow comparison for objects
export const shallowEqual = (obj1: any, obj2: any): boolean => {
  if (obj1 === obj2) return true;
  
  if (!obj1 || !obj2) return false;
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  for (const key of keys1) {
    if (obj1[key] !== obj2[key]) return false;
  }
  
  return true;
};

// Memoized list component
interface MemoizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string;
  className?: string;
}

export const MemoizedList = React.memo(<T,>({
  items,
  renderItem,
  keyExtractor,
  className = ''
}: MemoizedListProps<T>) => {
  const memoizedItems = useMemo(() => 
    items.map((item, index) => ({
      key: keyExtractor(item, index),
      element: renderItem(item, index)
    }))
  , [items, renderItem, keyExtractor]);

  return (
    <div className={className}>
      {memoizedItems.map(({ key, element }) => (
        <React.Fragment key={key}>{element}</React.Fragment>
      ))}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.items.length === nextProps.items.length &&
    prevProps.className === nextProps.className &&
    prevProps.renderItem === nextProps.renderItem &&
    prevProps.keyExtractor === nextProps.keyExtractor
  );
});

MemoizedList.displayName = 'MemoizedList';