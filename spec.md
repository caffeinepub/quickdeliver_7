# Brink

## Current State
All backend data (orders, profiles, messages, admin principal, drivers, applications) is stored in non-stable mutable variables. Every deployment wipes all data and resets `_stableAdminPrincipal` to null, causing `isAdminCaller` to return false for everyone, breaking all admin actions (delete order, delete application, load orders, etc.).

## Requested Changes (Diff)

### Add
- `stable var` declarations for all persistent data (admin principal, order/profile/message/driver/application data)
- `system func preupgrade()` to serialize mutable state to stable arrays before upgrade
- `system func postupgrade()` to restore mutable state from stable arrays after upgrade

### Modify
- `var _stableAdminPrincipal` → `stable var _stableAdminPrincipal` (critical fix)
- `nextOrderId`, `nextMessageId`, `nextDriverApplicationId` → backed by stable vars
- All mutable Maps/Sets/Lists → initialized from stable arrays on startup

### Remove
- Nothing removed

## Implementation Plan
1. Add stable backing variables for all mutable state
2. Initialize mutable collections from stable arrays at actor startup
3. Implement `preupgrade` to snapshot mutable state to stable arrays
4. Implement `postupgrade` to restore from stable arrays and reset counters
5. Keep all existing public API signatures unchanged
