import { useEffect, useState } from 'react';
import { useAppStore } from '@/stores/appStore';
import { Camera, Mic, Wifi, X } from 'lucide-react';

export function OnboardingModal() {
  const onboardingDone = useAppStore((s) => s.onboardingDone);
  const setOnboardingDone = useAppStore((s) => s.setOnboardingDone);
  const [step, setStep] = useState(0);

  if (onboardingDone) return null;

  const steps = [
    {
      title: 'Bem-vindo ao Velora',
      body: 'Estúdio multicanal para TikTok e Twitch. Conecte suas contas, configure câmera e vá ao vivo.',
      icon: Camera,
    },
    {
      title: 'Permissões',
      body: 'O Velora precisa de câmera, microfone e rede local (chat no celular). Aceite quando o Windows solicitar.',
      icon: Mic,
    },
    {
      title: 'Rede e firewall',
      body: 'Para o chat no iPhone, permita o Velora na rede privada. Porta LAN: 17570.',
      icon: Wifi,
    },
  ];

  const current = steps[step];
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-md rounded-xl border border-pl-border pl-panel-solid p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-pl-text">Primeiros passos</h2>
          <button
            type="button"
            onClick={() => setOnboardingDone(true)}
            className="rounded p-1 text-pl-muted hover:text-pl-text"
          >
            <X size={16} />
          </button>
        </div>
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-pl-primary/20 p-4 text-pl-accent">
            <Icon size={32} />
          </div>
        </div>
        <h3 className="mb-2 text-center text-sm font-semibold text-pl-text">{current.title}</h3>
        <p className="mb-6 text-center text-xs leading-relaxed text-pl-muted">{current.body}</p>
        <div className="flex gap-2">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="flex-1 rounded-lg border border-pl-border py-2 text-xs text-pl-muted"
            >
              Voltar
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (step < steps.length - 1) setStep(step + 1);
              else setOnboardingDone(true);
            }}
            className="btn-brand flex-1 rounded-lg py-2 text-xs"
          >
            {step < steps.length - 1 ? 'Próximo' : 'Começar'}
          </button>
        </div>
        <p className="mt-3 text-center text-[10px] text-pl-dim">
          Passo {step + 1} de {steps.length}
        </p>
      </div>
    </div>
  );
}

export function LiveCountdownOverlay() {
  const countdownActive = useAppStore((s) => s.countdownActive);
  const setCountdownActive = useAppStore((s) => s.setCountdownActive);
  const [value, setValue] = useState(3);

  useEffect(() => {
    if (!countdownActive) return;
    setValue(3);
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCountdownActive(false);
    };
    window.addEventListener('keydown', onEsc);
    const t1 = setTimeout(() => setValue(2), 1000);
    const t2 = setTimeout(() => setValue(1), 2000);
    const t3 = setTimeout(() => setCountdownActive(false), 3000);
    return () => {
      window.removeEventListener('keydown', onEsc);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [countdownActive, setCountdownActive]);

  if (!countdownActive) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50">
      <span className="pointer-events-none animate-pulse text-8xl font-black text-white drop-shadow-lg">
        {value}
      </span>
      <p className="absolute bottom-20 text-xs text-pl-muted">Esc para cancelar</p>
    </div>
  );
}
