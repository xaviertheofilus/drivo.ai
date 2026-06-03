import asyncio
import sys
sys.path.insert(0, '.')

from openai_voice_service import get_voice_options, TTS_VOICES

def test_voices():
    print("=== Testing Voice Service ===")
    
    # Test 1: Check TTS_VOICES dict
    print(f"\n[1] TTS_VOICES has {len(TTS_VOICES)} voices:")
    for k, v in TTS_VOICES.items():
        print(f"    - {k}: {v['name']} ({v['tone']})")
    
    # Test 2: Check get_voice_options()
    print(f"\n[2] get_voice_options() returns:")
    voices = get_voice_options()
    print(f"    {len(voices)} voices")
    for v in voices:
        print(f"    - {v['key']}: {v['name']} ({v['tone']})")
    
    # Test 3: Verify expected voices
    expected = ["alloy", "ash", "ballad", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer", "verse", "marin", "cedar"]
    found_keys = [v['key'] for v in voices]
    
    print(f"\n[3] Expected 13 voices, found {len(voices)}")
    missing = [e for e in expected if e not in found_keys]
    if missing:
        print(f"    MISSING: {missing}")
    else:
        print("    All 13 voices present!")
    
    return len(voices) == 13 and not missing

if __name__ == "__main__":
    result = test_voices()
    print(f"\n=== Voice Service Test: {'PASS' if result else 'FAIL'} ===")