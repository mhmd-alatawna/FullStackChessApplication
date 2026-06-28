export default function Card({ title, value, description, children, className = "" }) {
  return (
    <article className={`summary-card ${className}`.trim()}>
      {title && <span className="summary-card-title">{title}</span>}
      {value !== undefined && <strong className="summary-card-value">{value}</strong>}
      {description && <p>{description}</p>}
      {children}
    </article>
  );
}
