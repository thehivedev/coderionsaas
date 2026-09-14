import { useEffect } from 'react';
import { supabase } from '~/lib/supabaseClient';

export default function LogoutRoute() {
  useEffect(() => {
    supabase.auth.signOut().then(() => {
      window.location.href = '/auth/login';
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#171717] flex items-center justify-center">
      <p className="text-[#A3A3A3]">Signing out...</p>
    </div>
  );
}
