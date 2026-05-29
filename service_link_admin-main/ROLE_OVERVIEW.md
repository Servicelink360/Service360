# Multi-Role Experience Overview

This app serves three distinct personas—admins, staff, and clients—and the UI/UX changes at multiple layers based on the authenticated profile type.

## Role Detection Pipeline
- Authentication stores the user profile (including `type`) in Redux and `localStorage` via [src/redux/auth/reducer.ts](src/redux/auth/reducer.ts#L17-L106).
- Constants mapping numeric types to roles (`userType.ADMIN`, `userType.STAFF`, `userType.CUSTOMER`) live in [src/constants/statusUser.ts](src/constants/statusUser.ts#L23-L44).
- Most components read `localStorage.getItem('profile')` on mount (e.g., the sidebar) or pull `state.Auth.profile` to decide what to render.

```mermaid
flowchart LR
    A[Login response
(profile, token)] --> B[Redux auth reducer
stores profile]
    B --> C[localStorage "profile"]
    C --> D{profile.type}
    D -->|3 (ADMIN)| E[Full admin navigation
+ management screens]
    D -->|2 (STAFF)| F[Field staff navigation
+ task/attendance tools]
    D -->|1 (CUSTOMER)| G[Client navigation
+ ticket/report views]
```

## Navigation Surface
- Sidebar menu definitions are role-specific: admins use the `options` array, staff the `optionsStaff`, and clients the `optionsCustomer`, all defined in [src/containers/Sidebar/options.ts](src/containers/Sidebar/options.ts#L1-L200).
- [src/containers/Sidebar/Sidebar.tsx](src/containers/Sidebar/Sidebar.tsx#L1-L140) selects the correct option list based on `profile.type` before rendering the Ant Design `Menu`.

## Dashboard / Landing Experience
- Every route loads `DashboardRoutes`, which mounts [src/containers/dashboard-page/index.tsx](src/containers/dashboard-page/index.tsx#L1-L160).
- That page renders different cards:
  - **Admin & Customer**: total task counts plus the ticket status widget.
  - **Staff**: training/induction shortcuts and no ticket block.

## Feature-Level Divergence
- Task views, schedule screens, and attendance modules gate actions with `profile.type` checks (example: [src/containers/tasks/index.tsx](src/containers/tasks/index.tsx#L30-L190)).
- Customers see ticket-focused menus, while staff get field tools such as `user-sites` and training.

## Data Flow / Backend
- The dashboard widgets rely on `/v1/common/dashboardData`, implemented in [service_link_api-main/src/common/common.service.ts](../service_link_api-main/src/common/common.service.ts#L70-L150). Counts are filtered server-side by the authenticated user, so each role only sees their relevant stats.
- Redux sagas under [src/redux/dashboard/saga.ts](src/redux/dashboard/saga.ts) fetch that endpoint and place the payload in `state.dashboard`, which the dashboard page consumes regardless of role.

Together, these layers ensure the SPA delivers distinct experiences for admins, staff, and clients while sharing the same codebase.
