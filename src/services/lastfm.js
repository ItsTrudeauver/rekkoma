// src/services/lastfm.js

const API_KEY = '461dff1925df6395dc2f0d2ad22f0e1a'; // Replace this!
const BASE_URL = 'https://ws.audioscrobbler.com/2.0/';

export async function fetchTrackTags(artist, trackName) {
  try {
    const url = new URL(BASE_URL);
    url.searchParams.append('method', 'track.gettoptags');
    url.searchParams.append('artist', artist);
    url.searchParams.append('track', trackName);
    url.searchParams.append('api_key', API_KEY);
    url.searchParams.append('format', 'json');
    url.searchParams.append('autocorrect', '1'); // Fix misspellings automatically

    const res = await fetch(url);
    const data = await res.json();

    if (data?.toptags?.tag) {
      // Last.fm returns an array of objects: { name: "sad", count: 100, ... }
      // We just want the names, normalized to lowercase
      return data.toptags.tag.map(t => t.name.toLowerCase());
    }
    return [];
  } catch (error) {
    console.warn(`Last.fm fetch failed for ${trackName}:`, error);
    return [];
  }
}