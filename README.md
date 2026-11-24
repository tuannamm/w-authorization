# w-authorization

Authorization worker (RBAC) for the project-management system.

Owns roles, the permission catalog and user-role assignments. Exposes NestJS TCP
message patterns (`authorization.*`) used by the API gateway and other services.

Default roles: `admin` (system, always every permission), `senior-manager`, `member` (default).

- Docs (plan, knowledge, interview questions): `knowledge-base/projects/w-authorization/documents/` at the workspace root. This repo holds code only.
- Config: `.env.example` (TCP `PORT=4003`, health `HEALTH_PORT=9003`, MongoDB, Keycloak read-only, `BOOTSTRAP_ADMIN_USER_ID`)
- Scripts: `npm run build | test | lint | test:mongo` (Node >= 24)
