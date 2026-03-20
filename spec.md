# Brink

## Current State
Brink is a delivery platform for Tacoma. Backend data (orders, userProfiles, drivers, orderMessages, driverMessages, driverApplications, counters) are NOT declared as stable, so they get wiped on every deployment.

## Requested Changes (Diff)

### Add
- Nothing new

### Modify
- All backend data structures and counters must be stable so data persists across deployments
- Fix frontend error handling for clearer failures

### Remove
- Nothing

## Implementation Plan
1. Regenerate backend with stable storage for all data
2. Keep all existing functionality
