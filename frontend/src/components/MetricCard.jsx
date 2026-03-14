function MetricCard({ kicker, value, title, description, children, className = "" }) {
  return (
    <section className={`panel metric-card ${className}`.trim()}>
      {kicker ? <div className="metric-kicker">{kicker}</div> : null}
      {value ? <div className="metric-value">{value}</div> : null}
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {children}
    </section>
  );
}

export default MetricCard;
