# stashlist
Flag scenes in StashBox (StashDB.org) as
- wishlist
- ignore
- history
- matches (available in local stashapp instance)
- ignore (by performer or studio)

## components
- server/
  - run the stashlist server
- clients
  - userscript for stashdb
- plugin
  - plugin for automatic history sync

# alternatives
[millatime1010/stashdb-extension](https://github.com/millatime1010/stashdb-extension)  
[7dJx1qP/stashdb-userscripts](https://github.com/7dJx1qP/stashdb-userscripts)

Both the userscript and stashdb-extension are very handy if you just want to wishlist and see what you have locally but have limitations once you go past 5000 marked scenes or want more aggregation.

stashlist
- !!! communiciates with [remote server](PRIVACY.md) !!!
- history/ previous scene tracking
- bulk import/ export
- `/wishlist` page for all wishlisted scenes
- ignored performer/ studio filters
- automatic syncing from stashapp
- no scene limit (as opposed to very high limit)
- progress tracker for studios/ performer (WIP)