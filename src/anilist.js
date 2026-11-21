const ENDPOINT = "https://graphql.anilist.co";

async function request(query, variables = {}) {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables })
  });
  if (!response.ok) {
    if (response.status === 429) throw new Error("AniList rate limit reached. Please wait a moment.");
    throw new Error(`AniList request failed (${response.status})`);
  }
  const json = await response.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data;
}

const MEDIA_FIELDS = `
  id
  title { romaji english native }
  coverImage { medium large extraLarge }
  bannerImage
  description(asHtml: false)
  episodes
  format
  seasonYear
  averageScore
  genres
`;

export async function fetchAnime(sort = "TRENDING") {
  const query = `query ($sort: [MediaSort]) {
    Page(page: 1, perPage: 18) {
      media(type: ANIME, sort: $sort, isAdult: false) { ${MEDIA_FIELDS} }
    }
  }`;
  const data = await request(query, { sort: [sort] });
  return data.Page.media;
}

export async function searchAnime(search) {
  const query = `query ($search: String) {
    Page(page: 1, perPage: 24) {
      media(type: ANIME, search: $search, sort: POPULARITY_DESC, isAdult: false) { ${MEDIA_FIELDS} }
    }
  }`;
  const data = await request(query, { search });
  return data.Page.media;
}

export async function fetchAnimeById(id) {
  const query = `query ($id: Int) {
    Media(id: $id, type: ANIME) { ${MEDIA_FIELDS} }
  }`;
  const data = await request(query, { id });
  return data.Media;
}
