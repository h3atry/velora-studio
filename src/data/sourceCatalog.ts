import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  Camera,
  Cast,
  Clock,
  Gamepad2,
  Image,
  Link2,
  MessageSquare,
  Monitor,
  Radio,
  Smartphone,
  Target,
  Trophy,
  Type,
  Users,
  Video,
  Wifi,
  AppWindow,
} from 'lucide-react';

export type SourceCategory = 'general' | 'widget';

export type SourceTypeId =
  | 'game-capture'
  | 'camera'
  | 'screen-capture'
  | 'phone-camera'
  | 'window-capture'
  | 'image'
  | 'text'
  | 'link'
  | 'video'
  | 'broadcast'
  | 'capture-card'
  | 'stream'
  | 'alert'
  | 'goal'
  | 'chat-box'
  | 'creator-rankings'
  | 'viewer-ranking'
  | 'countdown';

export interface SourceCatalogItem {
  id: SourceTypeId;
  label: string;
  category: SourceCategory;
  icon: LucideIcon;
  description: string;
  previewHint: string;
}

const IMPLEMENTED: SourceTypeId[] = [
  'camera',
  'game-capture',
  'screen-capture',
  'window-capture',
  'alert',
  'goal',
  'chat-box',
  'countdown',
  'image',
];

export function isSourceImplemented(id: SourceTypeId): boolean {
  return IMPLEMENTED.includes(id);
}

export const SOURCE_CATALOG: SourceCatalogItem[] = [
  {
    id: 'game-capture',
    label: 'Captura de jogo',
    category: 'general',
    icon: Gamepad2,
    description:
      'Captura jogos que você está jogando no desktop. O Velora suporta a maioria dos jogos modernos em tela cheia e em modo janela.',
    previewHint: 'Selecione o processo do jogo após adicionar',
  },
  {
    id: 'camera',
    label: 'Câmera',
    category: 'general',
    icon: Camera,
    description:
      'Adiciona sua webcam ou câmera USB ao layout. Ideal para aparecer na LIVE enquanto joga ou conversa.',
    previewHint: 'Usa a câmera configurada em Transmissão',
  },
  {
    id: 'screen-capture',
    label: 'Captura de tela',
    category: 'general',
    icon: Monitor,
    description:
      'Captura o monitor inteiro ou uma área específica. Útil para tutoriais, apresentações e reação a conteúdo.',
    previewHint: 'Escolha o monitor na configuração',
  },
  {
    id: 'phone-camera',
    label: 'Câmera do celular',
    category: 'general',
    icon: Smartphone,
    description:
      'Use o celular como câmera via rede local (NDI/LAN). Conecte na mesma Wi‑Fi do PC.',
    previewHint: 'Em breve: link QR no app mobile',
  },
  {
    id: 'window-capture',
    label: 'Captura de janela',
    category: 'general',
    icon: AppWindow,
    description:
      'Captura apenas uma janela específica — navegador, chat, Spotify, etc. — sem expor o resto da tela.',
    previewHint: 'Selecione a janela na lista',
  },
  {
    id: 'image',
    label: 'Imagem',
    category: 'general',
    icon: Image,
    description: 'Exibe PNG, JPG ou GIF estático ou animado no layout da LIVE.',
    previewHint: 'Arraste um arquivo ou escolha da pasta',
  },
  {
    id: 'text',
    label: 'Texto',
    category: 'general',
    icon: Type,
    description: 'Título, lower third ou aviso personalizado sobre o vídeo.',
    previewHint: 'Edite fonte, cor e posição depois de adicionar',
  },
  {
    id: 'link',
    label: 'Vincular',
    category: 'general',
    icon: Link2,
    description: 'Incorpora conteúdo via URL (página web, widget externo).',
    previewHint: 'Cole a URL na configuração da origem',
  },
  {
    id: 'video',
    label: 'Vídeo',
    category: 'general',
    icon: Video,
    description: 'Reproduz um arquivo de vídeo local em loop ou uma vez durante a LIVE.',
    previewHint: 'MP4, MOV e WebM suportados',
  },
  {
    id: 'broadcast',
    label: 'Transmitir',
    category: 'general',
    icon: Cast,
    description: 'Recebe stream de outro dispositivo ou software via RTMP/SRT local.',
    previewHint: 'Configure URL de ingestão',
  },
  {
    id: 'capture-card',
    label: 'Placa de captura',
    category: 'general',
    icon: Wifi,
    description: 'Entrada HDMI de placa de captura (Elgato, AVerMedia, etc.) para console ou câmera.',
    previewHint: 'Detecta dispositivos DirectShow',
  },
  {
    id: 'stream',
    label: 'Transmissão',
    category: 'general',
    icon: Radio,
    description: 'Origem de mídia em fluxo contínuo (playlist, IP cam, etc.).',
    previewHint: 'Informe endereço do fluxo',
  },
  {
    id: 'alert',
    label: 'Alerta',
    category: 'widget',
    icon: Bell,
    description: 'Mostra alertas de seguidores, presentes e doações via webhook local (porta 17571).',
    previewHint: 'Integração StreamElements-style',
  },
  {
    id: 'goal',
    label: 'Meta',
    category: 'widget',
    icon: Target,
    description: 'Barra de progresso para meta de seguidores, likes ou doações.',
    previewHint: 'Sincroniza com informações da LIVE',
  },
  {
    id: 'chat-box',
    label: 'Caixa de chat',
    category: 'widget',
    icon: MessageSquare,
    description: 'Exibe mensagens do chat unificado TikTok + Twitch sobre o vídeo.',
    previewHint: 'Chat já conectado ao iniciar LIVE',
  },
  {
    id: 'creator-rankings',
    label: 'Classificações de criadores',
    category: 'widget',
    icon: Trophy,
    description: 'Ranking de criadores ou batalha de LIVE (quando disponível na API).',
    previewHint: 'Widget visual — dados mock até API',
  },
  {
    id: 'viewer-ranking',
    label: 'Classificação de espectadores',
    category: 'widget',
    icon: Users,
    description: 'Top espectadores, gifters ou membros da LIVE.',
    previewHint: 'Atualiza com performance TikTok',
  },
  {
    id: 'countdown',
    label: 'Contagem regressiva',
    category: 'widget',
    icon: Clock,
    description: 'Timer regressivo antes de eventos, sorteios ou início da LIVE.',
    previewHint: 'Configure duração após adicionar',
  },
];

export const CATEGORY_LABELS: Record<SourceCategory, string> = {
  general: 'Geral',
  widget: 'Widget',
};

export function getSourceById(id: SourceTypeId): SourceCatalogItem | undefined {
  return SOURCE_CATALOG.find((s) => s.id === id);
}

export function defaultSourceName(id: SourceTypeId, index: number): string {
  const base = getSourceById(id)?.label ?? 'Origem';
  return index > 0 ? `${base} ${index + 1}` : base;
}
