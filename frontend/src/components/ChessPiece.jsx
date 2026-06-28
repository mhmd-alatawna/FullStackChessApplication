export default function ChessPiece({ type, color }) {
  const piece = type.toLowerCase();
  return (
    <svg className={`chess-piece ${color}`} viewBox="0 0 100 100" aria-hidden="true">
      <g className="piece-shape" strokeLinecap="round" strokeLinejoin="round">
        {piece === "p" && <>
          <circle cx="50" cy="28" r="14" />
          <path d="M39 43c2 8 1 17-7 27h36c-8-10-9-19-7-27z" />
          <path d="M27 72h46l6 12H21z" />
        </>}
        {piece === "r" && <>
          <path d="M24 19h13v10h9V19h9v10h9V19h13v24H24z" />
          <path d="M31 43h38l-4 29H35z" />
          <path d="M25 72h50l6 12H19z" />
        </>}
        {piece === "n" && <>
          <path d="M25 73c10-14 13-26 12-41l19-15 2 12c16 8 20 24 15 43H52c3-11 1-18-6-24-2 10-7 18-15 25z" />
          <circle className="piece-detail" cx="57" cy="35" r="2.7" />
          <path className="piece-detail-line" d="M45 44c8 2 14 1 20-3" />
          <path d="M22 73h54l6 11H17z" />
        </>}
        {piece === "b" && <>
          <path d="M50 16c10 8 16 17 16 27 0 8-4 15-11 21H45c-7-6-11-13-11-21 0-10 6-19 16-27z" />
          <path className="piece-detail-line" d="M57 26 43 48" />
          <path d="M30 64h40l5 9H25zM22 74h56l5 10H17z" />
        </>}
        {piece === "q" && <>
          <circle cx="21" cy="24" r="5" /><circle cx="40" cy="17" r="5" /><circle cx="60" cy="17" r="5" /><circle cx="79" cy="24" r="5" />
          <path d="m23 30 12 31h30l12-31-17 18-10-24-10 24z" />
          <path d="M29 62h42l4 10H25zM20 74h60l4 10H16z" />
        </>}
        {piece === "k" && <>
          <path className="piece-detail-line" d="M50 10v19M41 19h18" />
          <path d="M50 28c12 0 20 8 20 18 0 8-5 14-12 19H42c-7-5-12-11-12-19 0-10 8-18 20-18z" />
          <path d="M29 65h42l5 9H24zM19 75h62l4 9H15z" />
        </>}
      </g>
    </svg>
  );
}
