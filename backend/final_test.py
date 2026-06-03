import asyncio
import httpx
import json

async def test():
    async with httpx.AsyncClient(base_url='http://localhost:8000', timeout=30.0) as client:
        r = await client.get('/api/')
        print(f'Root: {r.status_code}')
        
        r = await client.post('/api/auth/login', json={'email': 'xaviertheofilus@gmail.com', 'password': 'DrivoAI2024!'})
        print(f'Login: {r.status_code}')
        token = json.loads(r.text)['access_token']
        headers = {'Authorization': f'Bearer {token}'}
        
        r = await client.post('/api/sessions', json={}, headers=headers)
        if r.status_code != 200:
            print(f'Error: {r.text}')
            return
        session_id = json.loads(r.text)['session_id']
        print(f'Session ID: {session_id}')
        
        r = await client.post(f'/api/sessions/{session_id}/turn',
            json={'text': 'Hello', 'language': 'en', 'latency_ms': 0, 'silence_seconds': 0, 'speech_energy': 0.5},
            headers=headers)
        print(f'Turn: {r.status_code}')
        print(f'Body: {r.text[:300]}')

asyncio.run(test())