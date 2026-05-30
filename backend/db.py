"""MongoDB client + collection accessors + GridFS bucket."""
import os
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket

mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
db_name = os.environ.get("DB_NAME", "drivoai")

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# Collections
users_col = db["users"]
refresh_tokens_col = db["refresh_tokens"]
personas_col = db["personas"]
sessions_col = db["sessions"]
turns_col = db["session_turns"]
chunks_col = db["rag_chunks"]

# GridFS bucket for file uploads (driver avatars, persona avatars, persona context files)
fs_bucket = AsyncIOMotorGridFSBucket(db, bucket_name="files")


async def ensure_indexes():
    await users_col.create_index("email", unique=True)
    await refresh_tokens_col.create_index("token_hash")
    await personas_col.create_index([("user_id", 1), ("is_active", 1)])
    await sessions_col.create_index([("user_id", 1), ("started_at", -1)])
    await turns_col.create_index([("session_id", 1), ("turn_index", 1)])
    await chunks_col.create_index([("user_id", 1), ("source_type", 1)])
