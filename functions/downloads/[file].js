const FILE = 'Pack 2 Rack.amxd';
const PRODUCTION_HOSTS = new Set(['p2r.gushon.com', 'pack-to-rack.pages.dev']);

async function recordDownload(database, day) {
  await database.prepare(
    `INSERT INTO download_counts (day, file_name, downloads)
     VALUES (?, ?, 1)
     ON CONFLICT (day, file_name)
     DO UPDATE SET downloads = downloads + 1`,
  ).bind(day, FILE).run();
}

export async function onRequest(context) {
  const response = await context.next();
  const { request, env } = context;
  const url = new URL(request.url);

  // Count whole-file requests only. HEAD, resumed ranges and previews don't
  // inflate the counter. This measures files served, not unique people.
  if (
    request.method !== 'GET' ||
    response.status !== 200 ||
    request.headers.has('Range') ||
    !PRODUCTION_HOSTS.has(url.hostname) ||
    url.pathname !== `/downloads/${encodeURIComponent(FILE)}`
  ) {
    return response;
  }

  if (!env.DOWNLOADS) {
    console.error('Download counter binding is missing');
    return response;
  }

  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());

  // Increment atomically, in the background, without blocking the file.
  context.waitUntil(
    recordDownload(env.DOWNLOADS, day).catch((error) => {
      console.error('Could not record download:', error.message);
    }),
  );

  return response;
}
