export function getRoleHomePath(role) {
  if (role === "guardian") {
    return "/guardian";
  }
  if (role === "admin") {
    return "/admin-portal";
  }
  return "/student";
}

