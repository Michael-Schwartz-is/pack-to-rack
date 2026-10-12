# Download counts

Cloudflare Pages counts successful whole-file GET requests for the AMXD on the
production domains. Counts are stored in the D1 database `pack-to-rack-downloads`.
The counter starts when this feature is deployed; previous downloads are not
included. Repeat downloads and bots can count. This does not prove that a user
finished saving the file, and it does not count downloads directly from GitHub.

Only the date (Asia/Jerusalem), filename and aggregate count are stored. No browser
analytics, cookies, IP addresses or visitor identifiers are collected by the
counter. Tracking failures are logged and do not prevent downloads.

Run from the repository, using the Cloudflare account for mike@gushon.com:

```sh
CLOUDFLARE_ACCOUNT_ID=9a99fd4dbb737b1f1686dac82f542265 npx wrangler d1 execute pack-to-rack-downloads --remote --command "SELECT COALESCE(SUM(downloads), 0) AS total_downloads FROM download_counts"
```

Daily counts:

```sh
CLOUDFLARE_ACCOUNT_ID=9a99fd4dbb737b1f1686dac82f542265 npx wrangler d1 execute pack-to-rack-downloads --remote --command "SELECT day, file_name, downloads FROM download_counts ORDER BY day DESC LIMIT 30"
```

The same SQL works in Cloudflare dashboard → Workers & Pages → D1 →
`pack-to-rack-downloads` → Console. The database is not exposed through a public API.

For a new database, initialize it before deploying the Pages Function:

```sh
CLOUDFLARE_ACCOUNT_ID=9a99fd4dbb737b1f1686dac82f542265 npx wrangler d1 execute pack-to-rack-downloads --remote --file db/download-counts.sql
```

The Git-connected Pages project uses `wrangler.toml` to bind `DOWNLOADS`. Only
`/downloads/*` invokes the function; the rest of the website stays static.
