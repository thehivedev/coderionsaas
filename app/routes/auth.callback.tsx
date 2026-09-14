import { useEffect } from 'react';
import { useSearchParams } from '@remix-run/react';
import { supabase } from '~/lib/supabaseClient';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next') || '/';

  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(() => {
        window.location.href = next;
      });
    } else {
      window.location.href = next;
    }
  }, [next, searchParams]);

  return (
    <div className="min-h-screen bg-[#171717] flex items-center justify-center">
      <div className="text-center">
        <svg className="w-12 h-12 text-[#9E7FFF] animate-spin mx-auto" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="mt-4 text-[#A3A3A3]">Verifying authentication...</p>
      </div>
    </div>
  );
}
