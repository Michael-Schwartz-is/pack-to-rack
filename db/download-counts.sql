CREATE TABLE IF NOT EXISTS download_counts (
  day TEXT NOT NULL,
  file_name TEXT NOT NULL,
  downloads INTEGER NOT NULL DEFAULT 0 CHECK (downloads >= 0),
  PRIMARY KEY (day, file_name)
);
