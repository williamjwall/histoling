interface Props {
  languages: number;
  families: number;
  onStart: () => void;
}

export function Intro({ languages, families, onStart }: Props) {
  return (
    <div className="intro" onPointerDown={onStart} role="button" tabIndex={0} onKeyDown={onStart}>
      <div className="intro-inner">
        <h1>
          Histo<em>Ling</em>
        </h1>
        <p className="intro-sub">The family tree of human language</p>
        <p className="intro-stats">
          {languages} languages, {families} families, and thousands of years of change
        </p>
        <div className="intro-cta">
          Touch anywhere to begin
        </div>
      </div>
    </div>
  );
}
