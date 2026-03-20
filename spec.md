# Brink

## Current State
- Admin can chat with promoted drivers via admin-driver messaging (sendAdminDriverMessage / sendDriverToAdminMessage / getAdminDriverMessages)
- Backend restricts sendDriverToAdminMessage to users in the `drivers` Set only
- Pending driver applicants have no way to receive or reply to admin messages
- Admin sees pending applications in Drivers tab but no Chat button per applicant
- User account dialog shows principal ID but no Messages section

## Requested Changes (Diff)

### Add
- Backend: `sendApplicantToAdminMessage(text)` -- allows any logged-in non-anonymous user to send a message in their thread (reuses adminDriverMessages keyed by principal)
- Backend: `getMyAdminMessages()` -- allows any logged-in user to read their own thread with admin
- Admin > Drivers tab > Pending Applications: Chat button per applicant opens same chat panel UI as driver chat
- User account dialog: "Messages" tab showing their admin message thread with a reply input

### Modify
- Backend: `sendAdminDriverMessage` already works fine; extend to also allow messaging applicants (no principal validation on whether they are a driver)
- Backend: `getAdminDriverMessages` -- already allows admin and the principal themselves; no change needed

### Remove
- Nothing

## Implementation Plan
1. Add `sendApplicantToAdminMessage` and `getMyAdminMessages` backend functions
2. Remove driver-only restriction from `sendAdminDriverMessage` so admin can message any principal (applicants too)
3. Admin > Drivers tab: add Chat button per applicant row, reuse DriverChatPanel component
4. Header account dialog: add Messages tab with a simple polling chat panel calling getMyAdminMessages / sendApplicantToAdminMessage
