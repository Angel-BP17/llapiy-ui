import { useState } from "react";
import { config } from "@/config/llapiy-config";
import { apiPost, unwrapData } from "@/lib/llapiy-api";
import { clearAuthSessionCache, getAuthSession } from "@/lib/auth-session";

interface LoginFormProps {
  onSuccess?: (data: any) => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      const payload = await apiPost<{
        token?: string;
        access_token?: string;
        token_type?: string;
        user?: unknown;
      }>(config.endpoints.auth.login, {
        user_name: userName,
        password
      });

      const result = unwrapData(payload);
      const token = result?.token ?? result?.access_token ?? null;

      localStorage.setItem("llapiy_authenticated", "true");
      localStorage.setItem("llapiy_auth_payload", JSON.stringify(result ?? {}));

      if (token) {
        localStorage.setItem("llapiy_auth_token", String(token));
      } else {
        localStorage.removeItem("llapiy_auth_token");
      }

      clearAuthSessionCache();
      void getAuthSession({ force: true });

      setSuccessMessage("Inicio de sesion exitoso.");
      onSuccess?.(result);

      if (!onSuccess) {
        window.location.assign("/");
      }
    } catch (error: unknown) {
      console.error("[LoginForm] Error:", error);
      const message =
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof (error as { message?: unknown }).message === "string"
          ? (error as { message: string }).message
          : "Error de conexion. Intenta nuevamente.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="user_name">
          Nombre de usuario
        </label>
        <input
          id="user_name"
          name="user_name"
          type="text"
          required
          autoComplete="off"
          placeholder="USUARIO"
          value={userName}
          onChange={(event) => setUserName(event.target.value.toUpperCase())}
          className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm uppercase text-slate-900 shadow-sm transition focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700" htmlFor="password">
          Contrasena
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          placeholder="********"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm transition focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100"
        />
      </div>

      {errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="h-12 w-full rounded-xl bg-blue-500 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? "Ingresando..." : "Iniciar sesion"}
      </button>
    </form>
  );
}
