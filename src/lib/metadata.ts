import type { BookmarkMetadata } from '../types';

interface MetadataResult {
  title?: string;
  image?: string;
  metadata?: BookmarkMetadata;
}

/** Fetch metadata for a YouTube URL */
async function fetchYouTubeMetadata(url: string): Promise<MetadataResult> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const resp = await fetch(oembedUrl);
    if (!resp.ok) return {};
    const data = (await resp.json()) as {
      title?: string;
      thumbnail_url?: string;
      author_name?: string;
    };
    return {
      title: data.title,
      image: data.thumbnail_url,
      metadata: { channel: data.author_name },
    };
  } catch {
    return {};
  }
}

/** Fetch metadata for a Twitter/X URL */
async function fetchTwitterMetadata(url: string): Promise<MetadataResult> {
  try {
    const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`;
    const resp = await fetch(oembedUrl);
    if (!resp.ok) return {};
    const data = (await resp.json()) as { author_name?: string };
    return {
      title: data.author_name ? `${data.author_name}'s post` : undefined,
    };
  } catch {
    return {};
  }
}

/** Fetch metadata via Microlink (generic fallback, 50 req/day free) */
async function fetchMicrolinkMetadata(url: string): Promise<MetadataResult> {
  try {
    const apiUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}`;
    const resp = await fetch(apiUrl);
    if (!resp.ok) return {};
    const json = (await resp.json()) as {
      data?: {
        title?: string;
        image?: { url?: string };
        readability?: { words?: number; minutes?: number };
      };
    };
    if (!json.data) return {};
    return {
      title: json.data.title,
      image: json.data.image?.url,
      metadata: {
        word_count: json.data.readability?.words,
        reading_time: json.data.readability?.minutes,
      },
    };
  } catch {
    return {};
  }
}

/** Fetch metadata for a bookmark URL based on its source type */
export async function fetchMetadata(url: string, sourceType: string): Promise<MetadataResult> {
  switch (sourceType) {
    case 'youtube':
      return fetchYouTubeMetadata(url);
    case 'twitter':
      return fetchTwitterMetadata(url);
    default:
      return fetchMicrolinkMetadata(url);
  }
}
