# Brink

## Current State
Images sent in admin chats display with hardcoded /api/blob/ URLs in HomePage.tsx and MyOrdersPage.tsx causing broken images. DriverDashboard.tsx correctly uses getBlobUrl(). MyOrdersPage DriverChatDrawer does not show driver images and customers cannot send images.

## Requested Changes (Diff)

### Add
- Image display in DriverChatDrawer using getBlobUrl
- Image upload/send capability for customers in DriverChatDrawer

### Modify
- HomePage.tsx OrderMessages: use getBlobUrl instead of /api/blob/
- MyOrdersPage.tsx AdminMessagesDrawer: use getBlobUrl
- MyOrdersPage.tsx DriverChatDrawer: show images + image upload UI

### Remove
- All hardcoded /api/blob/ URL patterns

## Implementation Plan
1. Fix HomePage.tsx: import useBlobStorage, use getBlobUrl in OrderMessages
2. Fix MyOrdersPage.tsx AdminMessagesDrawer: use getBlobUrl
3. Fix MyOrdersPage.tsx DriverChatDrawer: show images with getBlobUrl, add image upload before send
