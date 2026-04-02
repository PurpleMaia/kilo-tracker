CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    kilo_id INTEGER NOT NULL REFERENCES kilo(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    summary TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_tasks_kilo_id ON tasks(kilo_id);
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
