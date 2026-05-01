import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server.js';
import AdminSidebar from '@/components/AdminSidebar.jsx';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
if (!ADMIN_EMAIL) throw new Error('ADMIN_EMAIL environment variable is not set');

export const metadata = {
  title: 'Admin — TechBidly',
};

export default async function AdminLayout({ children }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login?from=/admin');
  if (user.email !== ADMIN_EMAIL) redirect('/');

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />
      <div className="flex-1 overflow-y-auto p-8" style={{ background: '#f2effe' }}>
        {children}
      </div>
    </div>
  );
}
