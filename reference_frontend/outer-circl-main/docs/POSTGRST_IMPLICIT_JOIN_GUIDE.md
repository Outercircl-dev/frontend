# PostgREST Implicit Join Syntax Guide

## Overview
PostgREST allows querying related tables using foreign key relationships without explicit JOINs.

## Correct Syntax

### Using Constraint Name (Recommended)
```typescript
const { data } = await supabase
  .from('events')
  .select('*, profiles!events_host_id_fkey(name, avatar_url)')
  .eq('id', eventId);
```

### How to Find Constraint Name
```sql
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'public.events'::regclass 
  AND contype = 'f';
```

## Common Mistakes

### ❌ Wrong: Using column name
```typescript
.select('*, profiles:host_id(*)')  // Fails with 400 error
```

### ❌ Wrong: Using generic bang syntax
```typescript
.select('*, profiles!host_id(*)')  // Only works if unique constraint exists
```

### ✅ Correct: Using constraint name
```typescript
.select('*, profiles!events_host_id_fkey(*)')  // Works with foreign key
```

## Requirements for Implicit Joins

1. **Foreign key must exist** between the tables
2. **Foreign key must reference public schema** (not auth.users)
3. **Use exact constraint name** in the query
4. **Profile table must have matching records** for referential integrity

## Foreign Key Best Practices

### ✅ Do This
```sql
-- Reference profiles table
ALTER TABLE events
ADD CONSTRAINT events_host_id_fkey
FOREIGN KEY (host_id) REFERENCES public.profiles(id);
```

### ❌ Don't Do This
```sql
-- Don't reference auth.users directly
ALTER TABLE events
ADD CONSTRAINT events_host_id_fkey
FOREIGN KEY (host_id) REFERENCES auth.users(id);  -- ❌ Not API-accessible
```

## Debugging

### Check if Foreign Key Exists
```sql
SELECT 
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'events';
```

### Common Error Messages

**"Could not find a relationship between 'events' and 'host_id'"**
- Wrong syntax used (column name instead of constraint name)
- Foreign key doesn't exist
- Foreign key references auth.users instead of profiles

**400 Bad Request**
- Implicit join syntax is invalid
- Check constraint name matches exactly
- Verify foreign key points to correct table

## Performance Considerations

### Add Indexes for Foreign Keys
```sql
CREATE INDEX idx_events_host_id ON events(host_id);
```

### Limit Columns in Joins
```typescript
// ✅ Good: Only select needed columns
.select('*, profiles!events_host_id_fkey(name, avatar_url)')

// ❌ Bad: Selecting everything increases payload
.select('*, profiles!events_host_id_fkey(*)')
```

## Testing Implicit Joins

```typescript
// Test query
const { data, error } = await supabase
  .from('events')
  .select('*, profiles!events_host_id_fkey(name, avatar_url)')
  .limit(1);

if (error) {
  console.error('Implicit join failed:', error);
} else {
  console.log('Success:', data);
}
```

Expected response structure:
```json
{
  "id": "...",
  "title": "...",
  "profiles": {
    "name": "...",
    "avatar_url": "..."
  }
}
```
