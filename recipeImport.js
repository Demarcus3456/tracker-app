// The web app does this via the browser's DOM (querySelectorAll on
// <script type="application/ld+json">). React Native has no DOM, so this
// fetches the raw HTML as text and pulls out those script blocks with a
// regex instead — same schema.org data, different extraction method.
// Also unlike a browser, RN's fetch isn't subject to CORS, so this can hit
// most recipe sites directly without a proxy.

function extractImageUrl(imgField) {
  if (!imgField) return null;
  if (typeof imgField === 'string') return imgField;
  if (Array.isArray(imgField)) return extractImageUrl(imgField[0]);
  if (imgField.url) return imgField.url;
  return null;
}

function extractInstructionsText(field) {
  if (!field) return '';
  if (typeof field === 'string') return field.trim();
  if (Array.isArray(field)) {
    return field.map(extractInstructionsText).filter(Boolean).join('\n');
  }
  if (typeof field === 'object') {
    if (field.text) return String(field.text).trim();
    if (field.itemListElement) return extractInstructionsText(field.itemListElement);
    if (field.name) return String(field.name).trim();
  }
  return '';
}

function findRecipeInJsonLd(html) {
  const blocks = [
    ...html.matchAll(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    ),
  ];
  for (const m of blocks) {
    try {
      const data = JSON.parse(m[1].trim());
      const candidates = [];
      if (Array.isArray(data)) candidates.push(...data);
      else if (data['@graph']) candidates.push(...data['@graph']);
      else candidates.push(data);
      for (const item of candidates) {
        const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type']];
        if (types.includes('Recipe')) return item;
      }
    } catch (e) {
      // malformed JSON-LD block, skip it
    }
  }
  return null;
}

// Fetches a URL and returns { title, image, ingredients, instructions }
// or throws if no structured Recipe data could be found.
export async function fetchRecipeFromUrl(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    },
  });
  if (!res.ok) {
    throw new Error(`Couldn't load that page (${res.status})`);
  }
  const html = await res.text();
  const recipe = findRecipeInJsonLd(html);
  if (!recipe) {
    throw new Error(
      "Couldn't find structured recipe data on that page. Not every site supports this."
    );
  }

  const title = (recipe.name || '').trim();
  const image = extractImageUrl(recipe.image);
  const ingredients = Array.isArray(recipe.recipeIngredient)
    ? recipe.recipeIngredient.map((s) => String(s).trim()).filter(Boolean)
    : [];
  const instructions = extractInstructionsText(recipe.recipeInstructions);

  return { title, image, ingredients, instructions };
}

