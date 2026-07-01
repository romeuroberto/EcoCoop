import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuthStore } from '../../store/auth.store';

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
});

type FormData = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      const response = await login(data);
      navigate(response.redirectTo);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { code?: string } } })?.response?.data?.code ===
        'ACCOUNT_DISABLED'
          ? 'Sua conta está desativada. Contate o administrador.'
          : 'Email ou senha incorretos.';
      setError(msg);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 lg:grid lg:grid-cols-[0.95fr_1.05fr]">
      <section className="hidden min-h-screen border-r border-emerald-900 bg-emerald-900 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="px-12 py-10 xl:px-16">
          <img
            src="/brand/logo-horizontal-color.png"
            alt="EcoCoop"
            className="h-20 w-auto rounded-lg object-contain object-left shadow-lg shadow-emerald-950/20"
          />
        </div>

        <div className="max-w-2xl px-12 pb-16 xl:px-16">
          <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-emerald-200">
            Ambiente operacional
          </p>
          <h1 className="max-w-xl text-4xl font-bold leading-tight text-white xl:text-5xl">
            Gestão clara para a rotina da cooperativa.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-emerald-50">
            Acompanhe cadastros, rotas e materiais em uma interface pensada para uso diário.
          </p>

          <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
            <div className="rounded-lg border border-emerald-400/30 bg-white/10 px-4 py-3">
              <span className="block text-sm font-semibold text-white">Rotas</span>
              <span className="mt-1 block text-xs text-emerald-100">planejamento e execução</span>
            </div>
            <div className="rounded-lg border border-emerald-400/30 bg-white/10 px-4 py-3">
              <span className="block text-sm font-semibold text-white">Materiais</span>
              <span className="mt-1 block text-xs text-emerald-100">entrada e saldo bruto</span>
            </div>
            <div className="rounded-lg border border-emerald-400/30 bg-white/10 px-4 py-3">
              <span className="block text-sm font-semibold text-white">Equipe</span>
              <span className="mt-1 block text-xs text-emerald-100">acessos por perfil</span>
            </div>
          </div>
        </div>
      </section>

      <main className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center lg:hidden">
            <img
              src="/brand/logo-stacked-color.png"
              alt="EcoCoop"
              className="mx-auto h-32 w-auto object-contain"
            />
            <p className="mt-3 text-sm text-slate-500">Gestão de cooperativas de reciclagem</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/10 sm:p-8">
            <div className="mb-8 hidden text-center lg:block">
              <img
                src="/brand/logo-stacked-color.png"
                alt="EcoCoop"
                className="mx-auto h-32 w-auto object-contain"
              />
              <p className="mt-3 text-sm text-slate-500">Gestão de cooperativas de reciclagem</p>
            </div>

            <div className="mb-6 text-center">
              <h2 className="text-xl font-semibold text-slate-950">Acesse sua conta</h2>
              <p className="mt-1 text-sm text-slate-500">Informe suas credenciais para continuar.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-800 mb-1">Email</label>
                <input
                  type="email"
                  autoComplete="email"
                  {...register('email')}
                  className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="admin@ecocoop.local"
                />
                {errors.email && (
                  <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-800 mb-1">Senha</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    {...register('password')}
                    className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-12 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute inset-y-0 right-0 flex min-h-[44px] w-12 items-center justify-center rounded-r-lg text-slate-500 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? (
                      <svg
                        aria-hidden="true"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path d="M3 3l18 18" />
                        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                        <path d="M9.9 4.2A9.8 9.8 0 0 1 12 4c5 0 9 5 10 8a15.1 15.1 0 0 1-3.1 4.8" />
                        <path d="M6.6 6.6A15.4 15.4 0 0 0 2 12c1 3 5 8 10 8a9.7 9.7 0 0 0 4.1-.9" />
                      </svg>
                    ) : (
                      <svg
                        aria-hidden="true"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8S2 12 2 12z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>
                )}
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 flex min-h-[44px] w-full items-center justify-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-emerald-300"
              >
                {isSubmitting ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
