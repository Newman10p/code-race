# Complete chat polish and route repair

## Scope
- Add a personal custom wallpaper upload to Chat appearance, alongside the built-in wallpaper choices.
- Persist the custom wallpaper for the signed-in user and apply it consistently to group chats, direct messages, and the setter–patron room.
- Verify the redesigned chat screens at desktop and mobile sizes, including readable bubbles and usable composers.
- Identify and fix the reported 404 without changing unrelated navigation.
- Run the project checks and verify the affected screens in the live preview.

## Technical details
- Extend chat preferences with a custom wallpaper URL and safe fallbacks.
- Store uploaded wallpaper images in private user-scoped cloud storage with access rules that prevent users reading or changing another user’s files.
- Update the appearance picker with upload, preview, replace, and remove controls.
- Keep built-in wallpapers working unchanged and use the custom image only when selected.
- Confirm all referenced routes exist and correct the exact mismatched route or redirect causing the 404.

## Completion criteria
- A signed-in user can upload, preview, use, replace, and remove their wallpaper.
- The selected wallpaper is visible in every chat type and remains selected after reload.
- No affected page produces a 404, runtime error, or failed build.
