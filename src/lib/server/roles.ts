export function hasRole(roles: string[], expectedRole: string): boolean {
  return roles.includes(expectedRole);
}

export function hasAnyRole(roles: string[], expectedRoles: string[]): boolean {
  return expectedRoles.some((role) => hasRole(roles, role));
}

export function requireRole(roles: string[], expectedRole: string): void {
  if (!hasRole(roles, expectedRole)) {
    throw new Error("Forbidden");
  }
}

export function requireAnyRole(roles: string[], expectedRoles: string[]): void {
  if (!hasAnyRole(roles, expectedRoles)) {
    throw new Error("Forbidden");
  }
}
