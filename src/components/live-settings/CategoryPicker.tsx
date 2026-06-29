import type { Platform } from '@/types';
import { ArrowLeft, Check, ChevronRight, HelpCircle, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';

const TOPICS = [
  { id: 'Jogos', label: 'Jogos', hasGames: true },
  { id: 'Chat e entrevistas', label: 'Chat e entrevistas', hasGames: false },
  { id: 'Batalha de LIVE', label: 'Batalha de LIVE', hasGames: false },
  { id: 'Música', label: 'Música', hasGames: false },
  { id: 'Dança', label: 'Dança', hasGames: false },
  { id: 'Vida cotidiana', label: 'Vida cotidiana', hasGames: false },
  { id: 'Educação', label: 'Educação', hasGames: false },
];

const GAMES = [
  'VALORANT',
  'Minecraft',
  'Resident Evil Requiem',
  "Marvel's Spider-Man 2",
  'Roblox',
  'GTA V',
  'League of Legends',
  'Fortnite',
  'Counter-Strike 2',
];

const TWITCH_CATEGORIES = [
  'Just Chatting',
  'VALORANT',
  'League of Legends',
  'Minecraft',
  'Grand Theft Auto V',
  'Fortnite',
  'Counter-Strike',
];

interface CategoryPickerProps {
  platform: Platform;
  topic: string;
  game: string;
  category: string;
  onSelect: (topic: string, game: string, category: string, gameId?: string) => void;
  onClose: () => void;
}

export function CategoryPicker({
  platform,
  topic,
  game,
  category,
  onSelect,
  onClose,
}: CategoryPickerProps) {
  const [step, setStep] = useState<'topic' | 'game'>(platform === 'tiktok' && game ? 'game' : 'topic');
  const [search, setSearch] = useState('');
  const [helixCategories, setHelixCategories] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (platform !== 'twitch' || search.length < 2) return;
    const api = window.electronAPI;
    if (!api?.twitchSearchCategories) return;
    const t = setTimeout(() => {
      void api.twitchSearchCategories!(search).then((cats) => {
        setHelixCategories(cats as { id: string; name: string }[]);
      });
    }, 300);
    return () => clearTimeout(t);
  }, [platform, search]);

  if (platform === 'twitch') {
    const items =
      helixCategories.length > 0
        ? helixCategories
        : TWITCH_CATEGORIES.filter((c) =>
            c.toLowerCase().includes(search.toLowerCase())
          ).map((name) => ({ id: '', name }));
    return (
      <PickerShell title="Selecionar categoria" onBack={onClose} onClose={onClose}>
        <SearchInput value={search} onChange={setSearch} />
        <ul className="max-h-64 overflow-y-auto">
          {items.map((cat) => (
            <li key={cat.id || cat.name}>
              <button
                type="button"
                onClick={() => {
                  onSelect('Jogos', cat.name, cat.name, cat.id || undefined);
                  onClose();
                }}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-white hover:bg-zinc-800"
              >
                {category === cat.name && <Check size={14} className="text-pl-accent" />}
                <span className={category === cat.name ? 'ml-0' : 'ml-5'}>{cat.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </PickerShell>
    );
  }

  if (step === 'game') {
    const filtered = GAMES.filter((g) => g.toLowerCase().includes(search.toLowerCase()));
    return (
      <PickerShell
        title="Selecionar jogo"
        onBack={() => setStep('topic')}
        onClose={onClose}
      >
        <SearchInput value={search} onChange={setSearch} />
        <ul className="max-h-64 overflow-y-auto">
          {filtered.map((g) => (
            <li key={g}>
              <button
                type="button"
                onClick={() => {
                  onSelect(topic, g, `${topic} | ${g}`);
                  onClose();
                }}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-white hover:bg-zinc-800"
              >
                {game === g && <Check size={14} className="text-pl-accent" />}
                <span className={game === g ? 'ml-0' : 'ml-5'}>{g}</span>
              </button>
            </li>
          ))}
        </ul>
      </PickerShell>
    );
  }

  return (
    <PickerShell title="Selecionar tópico" onClose={onClose}>
      {game && (
        <div className="mb-3">
          <p className="mb-1.5 text-xs text-pl-muted">Recentes</p>
          <button
            type="button"
            onClick={() => onSelect(topic, game, `${topic} | ${game}`)}
            className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-white hover:bg-zinc-700"
          >
            {game}
          </button>
        </div>
      )}
      <p className="mb-2 flex items-center gap-1 text-xs text-pl-muted">
        Selecionar tópico
        <HelpCircle size={10} />
      </p>
      <ul className="max-h-56 overflow-y-auto">
        {TOPICS.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => {
                if (t.hasGames) {
                  setStep('game');
                  setSearch('');
                } else {
                  onSelect(t.id, '', t.id);
                  onClose();
                }
              }}
              className="flex w-full items-center justify-between px-3 py-2.5 text-sm text-white hover:bg-zinc-800"
            >
              <span className="flex items-center gap-2">
                {topic === t.id && <Check size={14} className="text-pl-accent" />}
                <span className={topic === t.id ? '' : 'ml-5'}>{t.label}</span>
              </span>
              {t.hasGames && <ChevronRight size={14} className="text-pl-muted" />}
            </button>
          </li>
        ))}
      </ul>
    </PickerShell>
  );
}

function PickerShell({
  title,
  onBack,
  onClose,
  children,
}: {
  title: string;
  onBack?: () => void;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-pl-border bg-zinc-800 p-3">
      <div className="mb-3 flex items-center gap-2">
        {onBack && (
          <button type="button" onClick={onBack} className="text-white hover:text-pl-muted">
            <ArrowLeft size={16} />
          </button>
        )}
        <span className="flex-1 text-sm font-medium text-white">{title}</span>
        <button type="button" onClick={onClose} className="text-pl-muted hover:text-white">
          <X size={16} />
        </button>
      </div>
      {children}
    </div>
  );
}

function SearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative mb-3">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-pl-muted" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Pesquisar conteúdo"
        className="input-field pl-9 text-sm"
      />
    </div>
  );
}
