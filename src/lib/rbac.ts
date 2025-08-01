// Role-based access control utility

export type UserRole = 'master' | 'admin' | 'user';

interface Permission {
  action: 'create' | 'read' | 'update' | 'delete';
  resource: 'products' | 'categories' | 'users' | 'logs' | 'inquiries' | 'app_users' | 'notifications' | 'whats_new';
}

// Define permissions for each role
const rolePermissions: Record<UserRole, Permission[]> = {
  master: [
    // Master has all permissions
    { action: 'create', resource: 'products' },
    { action: 'read', resource: 'products' },
    { action: 'update', resource: 'products' },
    { action: 'delete', resource: 'products' },
    
    { action: 'create', resource: 'categories' },
    { action: 'read', resource: 'categories' },
    { action: 'update', resource: 'categories' },
    { action: 'delete', resource: 'categories' },
    
    { action: 'create', resource: 'users' },
    { action: 'read', resource: 'users' },
    { action: 'update', resource: 'users' },
    { action: 'delete', resource: 'users' },
    
    { action: 'read', resource: 'logs' },
    
    { action: 'read', resource: 'inquiries' },
    { action: 'update', resource: 'inquiries' },
    
    { action: 'read', resource: 'app_users' },
    { action: 'update', resource: 'app_users' },
    { action: 'create', resource: 'notifications' },
    { action: 'read', resource: 'notifications' },
    { action: 'update', resource: 'notifications' },
    { action: 'delete', resource: 'notifications' },
    { action: 'create', resource: 'whats_new' },
    { action: 'read', resource: 'whats_new' },
    { action: 'update', resource: 'whats_new' },
    { action: 'delete', resource: 'whats_new' },
  ],
  admin: [
    // Admin has most permissions except user management
    { action: 'create', resource: 'products' },
    { action: 'read', resource: 'products' },
    { action: 'update', resource: 'products' },
    { action: 'delete', resource: 'products' },
    
    { action: 'create', resource: 'categories' },
    { action: 'read', resource: 'categories' },
    { action: 'update', resource: 'categories' },
    { action: 'delete', resource: 'categories' },
    
    { action: 'read', resource: 'users' },
    
    { action: 'read', resource: 'logs' },
    
    { action: 'read', resource: 'inquiries' },
    { action: 'update', resource: 'inquiries' },
    
    { action: 'read', resource: 'app_users' },
    { action: 'update', resource: 'app_users' },
    { action: 'create', resource: 'notifications' },
    { action: 'read', resource: 'notifications' },
    { action: 'update', resource: 'notifications' },
    { action: 'delete', resource: 'notifications' },
    { action: 'create', resource: 'whats_new' },
    { action: 'read', resource: 'whats_new' },
    { action: 'update', resource: 'whats_new' },
    { action: 'delete', resource: 'whats_new' }
  ],
  user: [
    // Regular user has limited permissions
    { action: 'read', resource: 'products' },
    { action: 'read', resource: 'categories' },
    { action: 'read', resource: 'inquiries' },
    { action: 'read', resource: 'notifications' },
    { action: 'read', resource: 'whats_new' }
  ]
};

export const hasPermission = (
  userRole: UserRole,
  action: Permission['action'],
  resource: Permission['resource']
): boolean => {
  if (!userRole) return false;
  
  const permissions = rolePermissions[userRole];
  if (!permissions) return false; // Add this check
  
  return permissions.some(
    permission => 
      permission.action === action && 
      permission.resource === resource
  );
};

export const canAccessRoute = (
  userRole: UserRole,
  route: string
): boolean => {
  if (!userRole) return false;
  
  // Define route access based on role
  const routeAccess: Record<string, UserRole[]> = {
    '/dashboard': ['master', 'admin', 'user'],
    '/dashboard/products': ['master', 'admin', 'user'],
    '/dashboard/products/new': ['master', 'admin'],
    '/dashboard/products/edit': ['master', 'admin'],
    '/dashboard/categories': ['master', 'admin', 'user'],
    '/dashboard/categories/new': ['master', 'admin'],
    '/dashboard/categories/edit': ['master', 'admin'],
    '/dashboard/users': ['master'],
    '/dashboard/users/edit': ['master'],
    '/dashboard/app-users': ['master', 'admin'],
    '/dashboard/logs': ['master', 'admin'],
    '/dashboard/inquiries': ['master', 'admin', 'user'],
    '/dashboard/notifications': ['master', 'admin'],
    '/dashboard/whats-new': ['master', 'admin'],
  };
  
  // Check if the route exists in our mapping
  if (route in routeAccess) {
    return routeAccess[route].includes(userRole);
  }
  
  // For dynamic routes, check the base path
  for (const [path, roles] of Object.entries(routeAccess)) {
    if (route.startsWith(path)) {
      return roles.includes(userRole);
    }
  }
  
  // Default to false for unknown routes
  return false;
};
