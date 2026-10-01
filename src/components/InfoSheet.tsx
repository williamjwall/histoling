import { useEffect } from 'react';
import { RETENTION, ROOT_AGE } from '../data/chronology';

interface Props {
  languages: number;
  families: number;
  onClose: () => void;
}

export function InfoSheet({ languages, families, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="info-sheet" role="dialog" aria-label="About HistoLing" onClick={onClose}>
      <article onClick={(e) => e.stopPropagation()}>
        <button className="panel-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <div className="eyebrow">About</div>
        <h2>
          Histo<em>Ling</em>
        </h2>
        <p className="lede">
          {languages} languages in {families} families, drawn as one tree growing upward through{' '}
          {ROOT_AGE.toLocaleString()} years of human speech.
        </p>

        <section>
          <h3>Reading the tree</h3>
          <ul>
            <li>
              <b>Up is forward in time.</b> The origin sits at the bottom, today is the gold ring at the top, and every
              fork is drawn at the height of its estimated split date, to scale.
            </li>
            <li>
              <b>Distance apart ≈ time apart.</b> Languages are placed so the distance between any two best matches how
              long ago they split. Close relatives are placed most faithfully.
            </li>
            <li>
              <b>Fine twigs</b> show a closed family's languages; tap it to open the branch.
            </li>
            <li>
              <b>Dot size</b> follows the number of native speakers. Dashed rings mark time deeper than 10,000 years,
              beyond the reach of the method.
            </li>
          </ul>
        </section>

        <section>
          <h3>Exploring</h3>
          <ul>
            <li>Tap a family to open it; tap it again to close it.</li>
            <li>Drag to orbit · right-drag or two fingers to pan · scroll or pinch to zoom.</li>
            <li>Search for any language from the bar at the top.</li>
          </ul>
        </section>

        <section>
          <h3>Comparing two languages</h3>
          <p>
            Select a language, then type another into <b>Compare with…</b>, press <b>Tap on tree</b> and tap any
            language, or use the one-tap shortcut to the language you viewed before. Both lineages light up, a gold ring
            marks the moment they split, and a double helix shows how many of 100 core words they still share.
          </p>
        </section>

        <section>
          <h3>The method</h3>
          <p>
            Glottochronology treats vocabulary like DNA: core words (the Swadesh list — <i>water</i>, <i>two</i>,{' '}
            <i>mother</i>…) are replaced at a roughly steady rate, about {Math.round((1 - RETENTION) * 100)}% per
            thousand years. Two languages that split <i>t</i> years ago are expected to share about{' '}
            {RETENTION}
            <sup>2t/1000</sup> of that list. The split dates shown are scholarly estimates; the method is debated and
            becomes unreliable beyond ~10,000 years.
          </p>
        </section>

        <section>
          <h3>Sources</h3>
          <p>
            Descriptions and images from Wikipedia; speaker counts and codes from Wikidata; locations from Glottolog 5.3
            (Hammarström, Forkel, Haspelmath & Bank, CC BY 4.0).
          </p>
        </section>
      </article>
    </div>
  );
}
