# HistoLing

An interactive museum display of the family tree of human languages.

- A navigable 3D tree of time (three.js): height is years before present, to scale. Horizontally,
  languages are placed so the distance between any two best matches the time since they split
  (weighted stress layout fitted once over every language); collapsed families show as plumes
- Glottochronology: estimated shared core vocabulary (C = 0.86^(t₁+t₂), per millennium) for relatives,
  and side-by-side comparisons with the split date marked as a time slice through the cone
- Drag to pan, scroll or pinch to zoom, tap a family to open it
- Live summaries, images, native names, ISO codes and speaker counts from Wikipedia and Wikidata
- Search with fly-to, breadcrumb navigation, and an idle "attract" mode that resets the exhibit after 2 minutes

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/
```

## Map data (Glottolog)

`src/data/geo.json` holds the location of every Glottolog language, tagged with the tree node it belongs to. Regenerate it
after editing the tree:

```bash
curl -LO https://cdstar.eva.mpg.de//bitstreams/EAEA0-608B-9919-A962-0/glottolog_languoid.csv.zip
unzip glottolog_languoid.csv.zip
npm run geo -- languoid.csv
```

Nodes that Wikidata can't map to a Glottocode get one from `OVERRIDES` in `scripts/build-geo.ts`. Proposed homelands
are curated in `src/data/homelands.ts`.

Glottolog data: Hammarström, Forkel, Haspelmath & Bank, _Glottolog 5.3_, MPI-EVA Leipzig, CC BY 4.0.

## Data

The tree lives in `src/data/languages.ts`. Each entry has a name, an optional Wikipedia title, approximate
native speakers (millions), an era, and an `extinct` flag. Add a language with `L(name, speakers)`, an extinct one
with `X(name)`, or a family with `F(name, children)`.
