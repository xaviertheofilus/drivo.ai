import asyncio
import db
import auth_service
import bcrypt

async def fix_and_test():
    email = "xaviertheofilus@gmail.com"
    new_password = "DrivoAI2024!"
    
    # Step 1: Check user
    print(f"[1] Checking user {email}...")
    user = await db.get_user_by_email(email)
    if not user:
        print("USER NOT FOUND - Creating new user...")
        try:
            reg_result = await auth_service.register_user(email, new_password, "Xavier")
            print(f"User created: {reg_result['user']['id']}")
        except Exception as e:
            print(f"Registration failed: {e}")
            return
    else:
        print(f"User found: id={user['id']}")
        print(f"Failed attempts: {user.get('failed_attempts', 0)}")
        print(f"Locked: {user.get('locked_until', 'no')}")
    
    # Step 2: Reset password to known value
    print(f"\n[2] Resetting password for {email}...")
    reset_hash = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt(rounds=12)).decode()
    try:
        await db.update_user(user["id"], {
            "password_hash": reset_hash, 
            "failed_attempts": 0, 
            "locked_until": None
        })
        print("Password reset successful!")
    except Exception as e:
        print(f"Reset failed: {e}")
        return

    # Step 3: Test login
    print(f"\n[3] Testing login with password: {new_password}")
    try:
        result = await auth_service.login_user(email, new_password)
        print(f"LOGIN SUCCESS! User: {result['user']['id']}")
        print(f"Access token: {result['access_token'][:50]}...")
    except Exception as e:
        print(f"LOGIN FAILED: {e}")

asyncio.run(fix_and_test())