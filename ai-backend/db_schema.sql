CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    domain TEXT DEFAULT 'general',
    status TEXT DEFAULT 'PENDING'
);

CREATE TABLE IF NOT EXISTS embeddings (
    id SERIAL PRIMARY KEY,
    document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
    content TEXT,
    embedding vector(768)
);

CREATE TABLE IF NOT EXISTS nodes (
    id SERIAL PRIMARY KEY,
    document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
    label TEXT,
    type TEXT,
    UNIQUE(document_id, label)
);

CREATE TABLE IF NOT EXISTS edges (
    id SERIAL PRIMARY KEY,
    document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
    source_node_id INTEGER REFERENCES nodes(id) ON DELETE CASCADE,
    target_node_id INTEGER REFERENCES nodes(id) ON DELETE CASCADE,
    relationship TEXT,
    UNIQUE(document_id, source_node_id, target_node_id, relationship)
);
