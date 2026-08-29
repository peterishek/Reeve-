export default function Fonts() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap');
      .f-display { font-family: 'Fraunces', serif; }
      .f-body { font-family: 'Plus Jakarta Sans', sans-serif; }
      .f-mono { font-family: 'IBM Plex Mono', monospace; }
      .card-flip-wrap { perspective: 1400px; }
      .card-flip-inner { transform-style: preserve-3d; transition: transform 0.6s cubic-bezier(.4,.2,.2,1); }
      .card-flip-inner.is-flipped { transform: rotateY(180deg); }
      .card-face { backface-visibility: hidden; }
      .card-face.back { transform: rotateY(180deg); }
    `}</style>
  );
}
