// Supabase → Project Settings → API. The anon / publishable key is public by design;
// the row-level security in supabase/schema.sql is what protects the data.
// Both empty = leaderboard off, records stay in this browser only.
export default {
  url: '', // e.g. https://abcd1234.supabase.co
  anonKey: '',
};
