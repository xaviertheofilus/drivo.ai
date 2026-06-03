import asyncio
import db
import bcrypt

async def check():
    try:
        email = "xaviertheofilus@gmail.com"
        user = await db.get_user_by_email(email)
        if not user:
            print(f"User {email} not found")
            return
        
        db_hash = user.get("password_hash")
        print(f"Hash in DB: {db_hash}")
        
        test_pw = "Test12345@"
        try:
            is_match = bcrypt.checkpw(test_pw.encode(), db_hash.encode())
            print(f"Does '{test_pw}' match DB hash? {is_match}")
        except Exception as e:
            print(f"Bcrypt error: {e}")
            
    except Exception as e:
        print(f"General error: {e}")

if __name__ == "__main__":
    asyncio.run(check())
