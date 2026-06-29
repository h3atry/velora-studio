import { useAppStore } from '@/stores/appStore';
import { UserPlus, X } from 'lucide-react';
import { useState } from 'react';

export function ModeratorsTab() {
  const moderators = useAppStore((s) => s.moderators);
  const addModerator = useAppStore((s) => s.addModerator);
  const removeModerator = useAppStore((s) => s.removeModerator);
  const [adding, setAdding] = useState(false);
  const [handle, setHandle] = useState('');

  const submitAdd = () => {
    const trimmed = handle.trim().replace('@', '');
    if (!trimmed) return;
    const lower = trimmed.toLowerCase();
    if (moderators.some((m) => m.handle.toLowerCase() === lower)) {
      setHandle('');
      setAdding(false);
      return;
    }
    addModerator({
      id: `mod-${Date.now()}`,
      displayName: trimmed,
      handle: trimmed.toLowerCase(),
    });
    setHandle('');
    setAdding(false);
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm text-white">
          Moderadores ({moderators.length}/30)
        </h3>
        <button
          type="button"
          onClick={() => setAdding(true)}
          disabled={moderators.length >= 30}
          className="flex items-center gap-1 text-xs text-pl-muted hover:text-white disabled:opacity-40"
        >
          <UserPlus size={14} />
          Adicionar
        </button>
      </div>

      {adding && (
        <div className="mb-3 flex gap-2">
          <input
            className="input-field flex-1"
            placeholder="@usuario"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitAdd()}
          />
          <button
            type="button"
            onClick={submitAdd}
            className="rounded-lg btn-brand px-3 text-xs"
          >
            OK
          </button>
        </div>
      )}

      <ul className="space-y-2">
        {moderators.map((mod) => (
          <li
            key={mod.id}
            className="flex items-center gap-3 rounded-lg bg-zinc-800 px-3 py-2.5"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-600 text-sm font-medium text-white">
              {mod.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{mod.displayName}</p>
              <p className="truncate text-xs text-pl-muted">{mod.handle}</p>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-lg btn-brand px-3 py-1 text-xs"
            >
              Gerenciar
            </button>
            <button
              type="button"
              onClick={() => removeModerator(mod.id)}
              className="shrink-0 rounded-lg bg-zinc-700 p-1.5 text-pl-muted hover:text-white"
            >
              <X size={14} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
