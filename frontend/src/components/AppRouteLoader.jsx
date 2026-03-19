function AppRouteLoader({ label = "Loading page" }) {
  return (
    <div className="app-route-loader" role="status" aria-live="polite" aria-label={label}>
      <div className="app-route-loader-shell" aria-hidden="true">
        <span className="app-route-loader-orbit app-route-loader-orbit-one" />
        <span className="app-route-loader-orbit app-route-loader-orbit-two" />
        <span className="app-route-loader-core" />
      </div>
      <p className="app-route-loader-label">{label}</p>
    </div>
  );
}

export default AppRouteLoader;
