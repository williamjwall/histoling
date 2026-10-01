import { useEffect } from 'react';
import { RETENTION, ROOT_AGE } from '../data/chronology';

interface Props {
  languages: number;
  families: number;
  onClose: () => void;
}

export function AboutSheet({ languages, families, onClose }: Props) {
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
          A family tree of human language: {languages} languages in {families} families, growing upward through
          time to the languages spoken today. Families that can't be traced any further back meet at the bottom.
        </p>

        <section>
          <h3>Reading the tree</h3>
          <ul>
            <li>
              <b>Up is forward in time.</b> Each fork sits at the height of its estimated split date, drawn to scale.
              The gold ring at the top is today; the rings below mark thousands of years ago.
            </li>
            <li>
              <b>Close together means closely related.</b> Languages are spaced so that the distance between any two
              roughly matches how long ago they split.
            </li>
            <li>
              <b>Dots</b> are languages and families, sized by native speakers. A dot with a ring is a closed family:
              tap it to open it. Extinct languages are a duller shade with an italic name.
            </li>
            <li>
              <b>Dashed rings</b> mark time older than 10,000 years, where dates are far less certain.
            </li>
          </ul>
        </section>

        <section>
          <h3>Getting around</h3>
          <ul>
            <li>Tap a family to open it, tap a language to read about it, and search any language from the top bar.</li>
            <li>Drag to turn the tree, scroll or pinch to zoom, and right-drag or use two fingers to move it.</li>
            <li>
              <b>Side</b> shows the whole tree through time; <b>Above</b> looks down on today with every language
              opened out.
            </li>
            <li>
              The buttons at the bottom left zoom in and out, <b>Fit</b> the whole tree, and <b>Turn</b> or{' '}
              <b>Stop</b> a slow rotation. On a keyboard: <b>+</b> and <b>−</b> zoom, the arrow keys turn and tilt, and{' '}
              <b>0</b> fits.
            </li>
          </ul>
        </section>

        <section>
          <h3>Comparing two languages</h3>
          <p>
            Open <b>Compare</b> in the top bar, or use the compare button in a language's panel. Choose two languages
            by searching or by tapping the tree. You'll see when they split, their last common ancestor, how much basic
            vocabulary they are likely to still share, and their two lineages lit up on the tree.
          </p>
        </section>

        <section>
          <h3>How the dates and estimates work</h3>
          <p>
            The families and their branches follow the comparative method, the standard way linguists show that
            languages are related. Split dates are rounded scholarly estimates; those filled in between known dates
            are marked <i>est.</i> The shared-vocabulary figure comes from glottochronology, which assumes basic
            words (<i>water</i>, <i>two</i>, <i>mother</i>…) are replaced at a steady rate, about{' '}
            {Math.round((1 - RETENTION) * 100)}% every thousand years.
          </p>
        </section>

        <section>
          <h3>Limits and caveats</h3>
          <ul>
            <li>
              <b>The Origin is not a known ancestor.</b> Whether all languages share one ancestor is unknown. The
              bottom of the tree simply marks where reconstruction runs out, and its{' '}
              {ROOT_AGE.toLocaleString('en-US')}-year depth is a display choice.
            </li>
            <li>
              <b>Dates are estimates.</b> Many are debated, some by thousands of years, and uncertainty grows with
              age. The dashed rings mark time older than 10,000 years, where dates are far less certain.
            </li>
            <li>
              <b>Shared vocabulary is a rough illustration, not a measurement.</b> It is calculated from the dates,
              not counted from real word lists. Glottochronology is largely rejected by linguists because rates of
              change vary between languages; modern studies use Bayesian methods that allow for this.
            </li>
            <li>
              <b>Spacing is approximate.</b> No flat layout can show every distance exactly, so close relatives are
              placed most faithfully. Distance reflects time since a split, not similarity: shared vocabulary falls
              quickly at first, then levels off.
            </li>
            <li>
              <b>Languages also mix.</b> Borrowing, contact and creoles don't fit a simple tree, so creoles and
              isolates are shown as separate groups.
            </li>
            <li>
              <b>This is a selection.</b> It shows {languages} of the world's roughly 7,000 languages, chosen to
              represent each family.
            </li>
          </ul>
        </section>

        <section>
          <h3>Sources</h3>
          <p>
            Descriptions and images from Wikipedia; speaker counts and language codes from Wikidata; locations from
            Glottolog 5.3 (Hammarström, Forkel, Haspelmath &amp; Bank, CC BY 4.0).
          </p>
        </section>
      </article>
    </div>
  );
}
