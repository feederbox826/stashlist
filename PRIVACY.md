stashlist communicates with a **remote server**, ran by feederbox826.

You can and are encouraged to run your own instance, there are no differences other than default values being set. This was a personal project that people showed interest in. If you would like help bootstrapping your own instance, please reach out.

The database contains:
- userid
  - a randomly generated UUIDv4 that is tied to an integer for easier indexing
- stashdb-id
- type of list (wishlist, history, ignore)

There is no other information stored or logged in the database about users.

The webserver (caddy) is not configured to log. The source code, in it's entirety is available to download and view.

I solemly swear not to sell, distribute or make available any data to any third-party aggregator or service. Full user database dumps are available at `/api/list/all`