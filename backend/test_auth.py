import asyncio
import db

async def check_user():
    try:
        user = await db.get_user_by_email("xaviertheofilus@gmail.com")
        if user:
            print(f"USER FOUND: id={user['id']}, email={user['email']}")
            print(f"Failed attempts: {user.get('failed_attempts', 0)}")
            print(f"Locked until: {user.get('locked_until', 'not locked')}")
            print(f"Hash: {user.get('password_hash', 'N/A')[:50]}...")
        else:
            print("USER NOT FOUND")
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()

asyncio.run(check_user())