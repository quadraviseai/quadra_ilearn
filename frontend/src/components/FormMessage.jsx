function FormMessage({ type = "error", children }) {
  if (!children) {
    return null;
  }

  return <div className={`message message-${type}`}>{children}</div>;
}

export default FormMessage;
