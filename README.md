# w-authorization

Authorization worker (RBAC) for the project-management system.

Owns roles, the permission catalog and user-role assignments. Exposes NestJS TCP
message patterns used by the API gateway and other services.

Default roles: `admin`, `senior-manager`, `member`.
