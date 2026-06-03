import asyncio
import db
import bcrypt

def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt(rounds=12)).decode()

async def reset():
    email = "xaviertheofilus@gmail.com"
    new_pw = "Test12345@"
    new_hash = hash_password(new_pw)
    
    user = await db.get_user_by_email(email)
    if user:
        await db.update_user(user["id"], {"password_hash": new_hash, "failed_attempts": 0, "locked_until": None})
        print(f"Password reset for {email} to {new_pw}")
    else:
        print(f"User {email} not found")

if __name__ == "__main__":
    asyncio.run(reset())
