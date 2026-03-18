# QuickDeliver

## Current State
Customers fill in a request form including an estimated budget, and are immediately redirected to Stripe checkout to pay. There is no quote step — the customer sets their own price.

## Requested Changes (Diff)

### Add
- Order storage in the backend: each order has an ID, customer info (name, contact, address, request), status (pending / quoted / paid), and an optional quoted price set by admin.
- `submitOrder` backend function: accepts request, address, name, contact. Returns a numeric order ID.
- `getOrderStatus` backend function: given an order ID, returns the order details (status and quoted price if set). Public — no login required.
- `adminGetOrders` backend function: admin-only, returns all orders.
- `setOrderPrice` backend function: admin-only, sets the price (in cents) on an order and moves status to `quoted`.
- `createCheckoutSessionForOrder` backend function: given an order ID whose status is `quoted`, initiates Stripe checkout for the quoted amount. Marks order as `paid` on success.
- "Check my order" section on the homepage: customer enters their order ID to see status and, if quoted, a Pay button.

### Modify
- Customer form: remove the budget/estimated price field. Submission calls `submitOrder` and shows the returned order ID, with instructions to check back.
- Admin Orders tab: replace the Stripe Dashboard link with a live list of orders from `adminGetOrders`. Each pending order shows a price-input field and a "Send Quote" button. Quoted/paid orders show their status.
- "How it works" steps: update step 2 from "Set your budget" to "We review & send you a price", and step 3 to "Pay once you receive the quote".

### Remove
- Budget input field from the customer request form.
- Direct-to-Stripe checkout on form submission.

## Implementation Plan
1. Regenerate Motoko backend with Order type and all new functions listed above.
2. Update HomePage: remove budget field, on submit call `submitOrder`, show returned order ID, add order status lookup UI.
3. Update AdminPage Orders tab: fetch and display orders via `adminGetOrders`, allow admin to input price and call `setOrderPrice`.
4. Add checkout flow triggered from order status UI calling `createCheckoutSessionForOrder`.
