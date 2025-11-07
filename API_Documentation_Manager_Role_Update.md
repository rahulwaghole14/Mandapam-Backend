# Manager Role Release Notes (Frontend Reference)

Last updated: 2025-01-27

This document summarizes the backend changes introducing the **`manager`** role so the frontend team can adapt UI flows, access rules, and API integrations.

---

## 1. Overview

- New role: `manager`
- Purpose: Operations managers with the same district-scoped permissions as sub-admins
- Applies to: Web dashboard (authenticated routes)
- Authentication: standard JWT Bearer flow (`/api/auth/login`)

### Role Matrix Update

| Role | Scope | Notes |
|------|-------|-------|
| `admin` | Global | Full access across districts |
| `manager` | District | Same district guard as sub-admin |
| `sub-admin` | District | No change |
| `user` | Limited | Read-only depending on permissions |

- Managers appear in `user.role` payloads, permission checks, and token claims.
- District guard logic now applies to both `manager` and `sub-admin`.

---

## 2. API Changes & Expectations

### 2.1 Authentication

- Endpoint: `POST /api/auth/login`
- Response `user.role` can now be `manager`

```json
{
  "success": true,
  "token": "<jwt>",
  "user": {
    "id": 42,
    "name": "Operations Manager",
    "email": "ops.manager@example.com",
    "role": "manager",
    "district": "Pune",
    "state": "Maharashtra",
    "permissions": {
      "events": { "read": true, "write": true, "delete": false },
      "vendors": { "read": true, "write": true, "delete": false }
    }
  }
}
```

### 2.2 User Management (Admin Panel)

- Create user: `POST /api/auth/users`
  - Body field `role` now accepts `manager`
  - Validation message updated to: `Role must be admin, manager or sub-admin`
- Update/delete (`PUT/DELETE /api/auth/users/:id`): unchanged but UI should allow editing manager role

### 2.3 Role-Based Access Checks

- All routes previously scoped to `admin` + `sub-admin` now also accept `manager`
- District guard now treats `manager` the same as `sub-admin`

| Feature Area | Route Prefix | Frontend Impact |
|--------------|--------------|-----------------|
| Associations | `/api/associations` | Managers can create/edit/toggle status within district |
| Events | `/api/events` | Managers inherit create/edit constraints (district match) |
| Vendors | `/api/vendors` | Managers can manage vendors in their district |
| Dashboard | `/api/dashboard/...` | Metrics auto-filtered by manager’s district |

Example guard (backend):

```javascript
if (["manager", "sub-admin"].includes(req.user.role) && resourceDistrict !== req.user.district) {
  return res.status(403).json({
    success: false,
    message: `${req.user.role} can only access resources in ${req.user.district} district`
  });
}
```

### 2.4 Documentation Updates

- README, API docs, and overview guides now mention `manager` wherever roles are listed
- Frontend should reflect the same terminology in dropdowns, badges, and filters

---

## 3. Frontend Action Items

1. **Login & Session Handling**
   - Ensure role-based UI logic handles `role === 'manager'`
   - Update role labels/badges (e.g., `Manager` where appropriate)

2. **User Management UI**
   - Add `manager` option to role selector when admins create/edit users
   - Update validation messages to match backend (accept `manager`)

3. **Navigation & Permissions**
   - Mirror sub-admin navigation for managers (district-scoped views)
   - Review feature toggles that previously checked `sub-admin`

4. **District Context**
   - Display district info for managers similar to sub-admins
   - Prevent managers from selecting districts outside their scope when filtering or creating resources

5. **Testing Checklist**
   - ✅ Login as manager; verify dashboard shows district data
   - ✅ Create/update/delete events/vendors in own district
   - ✅ Attempt cross-district operations → expect 403
   - ✅ Create new manager via admin interface

---

## 4. Deployment Checklist (Backend Coordination)

- Database migration: run `node scripts/add-manager-role.js` **before** deploying API changes (adds enum value)
- Update seed data if we need default manager accounts (coordinate with backend)
- Notify QA to create/assign manager users for regression tests

---

## 5. Support

For issues or questions:
- Share request/response samples (headers, payloads)
- Tag the backend team in Slack `#mandap-backend`
- Reference this doc so we can keep it up-to-date
