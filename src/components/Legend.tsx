import { useState } from 'react';

export function Legend() {
  const [open, setOpen] = useState(false);
  return (
    <div className={`legend cone-legend ${open ? 'open' : ''}`}>
      <button className="legend-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="eyebrow">Legend</span>
        <svg viewBox="0 0 12 12" aria-hidden>
          <path d="M2 8l4-4 4 4" />
        </svg>
      </button>
      {open && (
        <>
          <div>
            <span className="lg-axis" /> up = forward in time, height to scale
          </div>
          <div>
            <span className="lg-gap" /> distance apart ≈ years since they split
          </div>
          <div>
            <span className="lg-wedge" /> fine twigs = a closed family's languages
          </div>
          <div>
            <span className="lg-deep" /> dashed rings: older than 10,000 years, beyond the method
          </div>
          <div>
            <span className="lg-dot big" /> <span className="lg-dot small" /> size ≈ native speakers
          </div>
        </>
      )}
    </div>
  );
}
