# Brink

## Current State
Brink is a delivery platform with customer ordering, admin dashboard, driver system, and messaging. Logged-in users see an Account dialog to save their name/email. There is no way for users to apply to become a driver or see their principal ID.

## Requested Changes (Diff)

### Add
- `submitDriverApplication(message: Text): async Nat` backend function -- stores a driver application tied to the caller's principal
- `getDriverApplications(): async [DriverApplication]` backend function -- admin only
- "Become a Brink Driver" button on the homepage (visible to logged-in non-driver, non-admin users)
- Driver application modal with a message field that submits to the backend
- Principal ID display with copy button inside the existing Account dialog in the header
- Driver Applications section in Admin Dashboard > Drivers tab showing applicant principal + message

### Modify
- Header Account dialog: add principal ID row with copy button
- AdminPage Drivers tab: add Applications section at top
- HomePage: add "Become a Brink Driver" CTA for eligible users

### Remove
- Nothing

## Implementation Plan
1. Add DriverApplication type and stable storage to backend
2. Add submitDriverApplication and getDriverApplications functions
3. Update Header to show principal ID with copy in account dialog
4. Add "Become a Brink Driver" button/modal to HomePage
5. Add Applications section to AdminPage Drivers tab
