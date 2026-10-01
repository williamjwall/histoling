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
          The family tree of human language: {languages} languages in {families} families, grown upward through{' '}
          {ROOT_AGE.toLocaleString('en-US')} years of change, from a single origin at the bottom to the languages spoken
          today at the top.
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
            Split dates are rounded scholarly estimates; those filled in between known dates are marked <i>est.</i>{' '}
            Shared vocabulary comes from glottochronology, which treats basic words (<i>water</i>, <i>two</i>,{' '}
            <i>mother</i>…) a little like DNA: they are replaced at a roughly steady rate, about{' '}
            {Math.round((1 - RETENTION) * 100)}% every thousand years. The method is debated and only gives a rough
            guide, especially for deep time.
          </p>
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
