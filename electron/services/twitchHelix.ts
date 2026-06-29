import { getTokens } from '../auth/tokenStore';

export async function fetchTwitchViewerCount(channelLogin: string): Promise<number> {
  const auth = getTokens('twitch');
  if (!auth?.accessToken) return 0;

  const login = channelLogin.replace(/^@/, '').toLowerCase();
  const headers = {
    'Client-Id': process.env.TWITCH_CLIENT_ID ?? '',
    Authorization: `Bearer ${auth.accessToken}`,
  };

  try {
    const userRes = await fetch(`https://api.twitch.tv/helix/users?login=${login}`, { headers });
    const userJson = (await userRes.json()) as { data?: { id: string }[] };
    const userId = userJson.data?.[0]?.id;
    if (!userId) return 0;

    const streamRes = await fetch(`https://api.twitch.tv/helix/streams?user_id=${userId}`, {
      headers,
    });
    const streamJson = (await streamRes.json()) as { data?: { viewer_count: number }[] };
    return streamJson.data?.[0]?.viewer_count ?? 0;
  } catch {
    return 0;
  }
}

export async function searchTwitchCategories(query: string): Promise<{ id: string; name: string }[]> {
  const auth = getTokens('twitch');
  if (!auth?.accessToken || !query.trim()) return [];

  const headers = {
    'Client-Id': process.env.TWITCH_CLIENT_ID ?? '',
    Authorization: `Bearer ${auth.accessToken}`,
  };

  try {
    const res = await fetch(
      `https://api.twitch.tv/helix/search/categories?query=${encodeURIComponent(query)}&first=20`,
      { headers }
    );
    const json = (await res.json()) as { data?: { id: string; name: string }[] };
    return json.data ?? [];
  } catch {
    return [];
  }
}

export async function updateTwitchStreamInfo(
  title: string,
  gameId: string
): Promise<boolean> {
  const auth = getTokens('twitch');
  if (!auth?.accessToken || !auth.userId) return false;

  const headers = {
    'Client-Id': process.env.TWITCH_CLIENT_ID ?? '',
    Authorization: `Bearer ${auth.accessToken}`,
    'Content-Type': 'application/json',
  };

  try {
    const res = await fetch(
      `https://api.twitch.tv/helix/channels?broadcaster_id=${auth.userId}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ title, game_id: gameId }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}
