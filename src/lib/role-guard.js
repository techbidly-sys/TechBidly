/**
 * Fetches the role for a given user from the profiles table.
 * Returns 'buyer' as a safe default if the profile is missing.
 */
export async function getProfileRole(supabase, userId) {
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();
  return data?.role ?? 'buyer';
}
