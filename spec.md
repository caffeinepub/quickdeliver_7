# Brink

## Current State
Brink is a delivery platform for Tacoma. Customers submit open-ended delivery requests on the homepage. An admin reviews requests in the admin dashboard at /admin, sets a price, and messages customers. Customers can view messages inline on the order confirmation screen immediately after submitting. There is no dedicated page for customers to review their past orders. The admin panel has been reporting a "failed to load orders" error due to two bugs: (1) stored login sessions don't set loginStatus to "success", so orders never load on page refresh; (2) the Caffeine admin token stored in sessionStorage is lost across browser restarts.

## Requested Changes (Diff)

### Add
- `getCustomerOrders()` backend function returning all orders belonging to the caller's principal
- A "My Orders" page (`/my-orders`) where logged-in customers can see all their past orders and any messages from Brink for each order
- Navigation link to "My Orders" in the Header when a customer is logged in
- Route entry for `my-orders` page in App.tsx and types/index.ts

### Modify
- `useInternetIdentity.ts`: When a stored session is found, set loginStatus to "success" (not "idle") so admin orders load after page refresh — already fixed
- `urlParams.ts`: Persist admin token in localStorage (not just sessionStorage) so it survives browser restarts — already fixed
- `AdminPage.tsx`: Use `!!identity` check for authentication so admin orders load from stored sessions as well
- `Header.tsx`: Show "My Orders" link for authenticated non-admin users

### Remove
- Nothing

## Implementation Plan
1. Add `getCustomerOrders() : async [Order]` to main.mo — returns orders where customerPrincipal matches caller
2. Add `MyOrdersPage.tsx` — shows list of customer's orders with status, description, and inline messages from Brink
3. Update `types/index.ts` to add `"my-orders"` to the Page type
4. Update `App.tsx` routing to handle `/my-orders` path and render the page
5. Update `Header.tsx` to show a "My Orders" button/link when the user is logged in
6. Update `AdminPage.tsx` isAuthenticated check to `!!identity`
