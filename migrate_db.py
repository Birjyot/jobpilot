"""
One-time migration script.
Adds the `gmail_credentials` column to the existing `user` table.
Run this ONCE with: python migrate_db.py
"""
import sqlite3
import os

DB_PATH = os.path.join('instance', 'jobs.db')

if not os.path.exists(DB_PATH):
    print(f"Database not found at {DB_PATH}. Starting fresh - no migration needed.")
else:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Check if column already exists
    cursor.execute("PRAGMA table_info(user)")
    columns = [row[1] for row in cursor.fetchall()]

    if 'gmail_credentials' not in columns:
        cursor.execute("ALTER TABLE user ADD COLUMN gmail_credentials TEXT")
        conn.commit()
        print("Migration successful: added 'gmail_credentials' column to 'user' table.")
    else:
        print("Column 'gmail_credentials' already exists. No migration needed.")

    conn.close()
