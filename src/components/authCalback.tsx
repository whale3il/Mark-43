
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../src/lib/supbase";

export default function AuthCallback() {
  const started = useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function completeGoogleLogin() {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (!data.session) {
          throw new Error("Google authentication session not found.");
        }

        const token = data.session.access_token;

        localStorage.setItem("whales_token", token);

        // Next: synchronize this Supabase user with Prisma.
        // Do not grant access to protected banking pages until
        // backend synchronization and authorization succeed.
        window.location.replace("/login");
      } catch (err: any) {
        setError(err.message || "Google authentication failed.");
      }
    }

    completeGoogleLogin();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-neutral-100">
      {error ? (
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-400">
            Authentication failed
          </h2>
          <p className="mt-3 text-sm text-neutral-400">{error}</p>
          <a href="/login" className="mt-5 inline-block text-emerald-400">
            Return to login
          </a>
        </div>
      ) : (
        <p className="text-neutral-400">Completing Google sign-in...</p>
      )}
    </div>
  );
}
