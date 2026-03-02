

CREATE TABLE profiles (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    first_name TEXT,
    last_name TEXT,
    dob TIMESTAMP,
    mokupuni VARCHAR,
    mauna TEXT,
    aina TEXT,
    wai TEXT,
    kula TEXT
);

CREATE TABLE kilo (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    location TEXT, -- user input for now, can make the lookup table later
    q1 TEXT,
    q2 TEXT,
    q3 TEXT,
    audio BYTEA, -- storing bytes for prototype, but should use a file system approach
    image BYTEA, -- storing bytes for prototype, but should use a file system approach
    created_at TIMESTAMP
    -- more TEXT   -- more distinct sections of kilo, following the framework
);

CREATE TABLE olelo_noeau (
    id SERIAL PRIMARY KEY,
    text TEXT -- actual olelo noeau text
);

