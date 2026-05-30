"""DrivoAI Backend API Test Suite - Comprehensive E2E Testing"""
import io
import json
import sys
import time
from datetime import datetime
from typing import Optional

import requests

BASE_URL = "https://claudeskill-builder.preview.emergentagent.com/api"
TIMEOUT = 30


class DrivoAITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.token = None
        self.refresh_token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.tests_failed = 0
        self.test_results = []
        self.test_email = f"e2e+{int(time.time())}@drivoai.com"
        self.test_password = "Pass@1234"
        self.test_full_name = "E2E Tester"

    def log(self, message: str, level: str = "INFO"):
        """Log test messages"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int,
                 data: Optional[dict] = None, files: Optional[dict] = None,
                 headers: Optional[dict] = None) -> tuple:
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        req_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            req_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            req_headers.update(headers)
        
        # Remove Content-Type for multipart
        if files:
            req_headers.pop('Content-Type', None)

        self.tests_run += 1
        self.log(f"Testing {name}...", "TEST")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=req_headers, timeout=TIMEOUT)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files, data=data, headers=req_headers, timeout=TIMEOUT)
                else:
                    response = requests.post(url, json=data, headers=req_headers, timeout=TIMEOUT)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=req_headers, timeout=TIMEOUT)
            elif method == 'DELETE':
                response = requests.delete(url, headers=req_headers, timeout=TIMEOUT)
            else:
                raise ValueError(f"Unsupported method: {method}")

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                self.log(f"✅ PASSED - {name} (Status: {response.status_code})", "PASS")
                self.test_results.append({"test": name, "status": "PASSED", "code": response.status_code})
            else:
                self.tests_failed += 1
                self.log(f"❌ FAILED - {name} (Expected {expected_status}, got {response.status_code})", "FAIL")
                self.log(f"   Response: {response.text[:200]}", "FAIL")
                self.test_results.append({
                    "test": name,
                    "status": "FAILED",
                    "expected": expected_status,
                    "actual": response.status_code,
                    "response": response.text[:200]
                })

            try:
                return success, response.json() if response.text else {}
            except:
                return success, {"raw": response.text}

        except Exception as e:
            self.tests_failed += 1
            self.log(f"❌ FAILED - {name} (Error: {str(e)})", "FAIL")
            self.test_results.append({"test": name, "status": "ERROR", "error": str(e)})
            return False, {}

    def test_auth_register(self):
        """Test user registration"""
        self.log("=== AUTH: Registration ===", "SECTION")
        success, response = self.run_test(
            "Register new user",
            "POST",
            "auth/register",
            200,
            data={
                "email": self.test_email,
                "password": self.test_password,
                "full_name": self.test_full_name
            }
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.refresh_token = response.get('refresh_token')
            self.user_id = response.get('user', {}).get('id')
            self.log(f"   User ID: {self.user_id}", "INFO")
            return True
        return False

    def test_auth_weak_password(self):
        """Test weak password validation"""
        weak_email = f"weak+{int(time.time())}@drivoai.com"
        success, _ = self.run_test(
            "Register with weak password 'pass'",
            "POST",
            "auth/register",
            422,
            data={"email": weak_email, "password": "pass"}
        )
        return success

    def test_auth_login(self):
        """Test login with registered credentials"""
        success, response = self.run_test(
            "Login with registered credentials",
            "POST",
            "auth/login",
            200,
            data={"email": self.test_email, "password": self.test_password}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            return True
        return False

    def test_auth_me(self):
        """Test /auth/me endpoint"""
        success, response = self.run_test(
            "GET /auth/me with bearer token",
            "GET",
            "auth/me",
            200
        )
        return success and response.get('email') == self.test_email

    def test_personas_templates(self):
        """Test getting persona templates"""
        self.log("=== PERSONAS: Templates ===", "SECTION")
        success, response = self.run_test(
            "GET /personas/templates (expect 6 templates)",
            "GET",
            "personas/templates",
            200
        )
        if success and isinstance(response, list):
            count = len(response)
            self.log(f"   Found {count} templates", "INFO")
            if count == 6:
                template_names = [t.get('name') for t in response]
                self.log(f"   Templates: {', '.join(template_names)}", "INFO")
                return True
            else:
                self.log(f"   Expected 6 templates, got {count}", "FAIL")
        return False

    def test_personas_activate_template(self):
        """Test activating a template persona"""
        # First get templates
        _, templates = self.run_test(
            "Get templates for activation",
            "GET",
            "personas/templates",
            200
        )
        if templates and isinstance(templates, list) and len(templates) > 0:
            template_id = templates[0]['id']
            success, _ = self.run_test(
                f"Activate template persona",
                "PUT",
                f"personas/{template_id}/activate",
                200
            )
            if success:
                # Verify it's active
                _, active = self.run_test(
                    "GET /personas/active",
                    "GET",
                    "personas/active",
                    200
                )
                return active and active.get('id') == template_id
        return False

    def test_personas_generate(self):
        """Test persona generation from text"""
        self.log("=== PERSONAS: Generation ===", "SECTION")
        description = "A friendly and energetic companion who loves music and road trips. Always upbeat and encouraging, with a passion for discovering new places and sharing interesting facts about the journey."
        success, response = self.run_test(
            "Generate persona from text description",
            "POST",
            "personas/generate",
            200,
            data={"description": description}
        )
        if success:
            required_keys = ['name', 'personality_summary', 'communication_style', 'tone_tags', 'system_prompt_fragment']
            has_all = all(k in response for k in required_keys)
            if has_all:
                self.log(f"   Generated persona: {response.get('name')}", "INFO")
                return response
        return None

    def test_personas_save_custom(self):
        """Test saving a custom persona"""
        # Generate first
        generated = self.test_personas_generate()
        if not generated:
            return None
        
        # Save it
        save_data = {
            "name": generated['name'],
            "personality_summary": generated['personality_summary'],
            "communication_style": generated['communication_style'],
            "tone_tags": generated['tone_tags'],
            "system_prompt": generated.get('system_prompt_fragment', 'You are a friendly AI companion.'),
            "sample_dialogue": generated.get('sample_dialogue')
        }
        success, response = self.run_test(
            "Save custom persona",
            "POST",
            "personas",
            200,
            data=save_data
        )
        if success and 'id' in response:
            return response['id']
        return None

    def test_personas_activate_custom(self, persona_id: str):
        """Test activating a custom persona"""
        success, _ = self.run_test(
            "Activate custom persona",
            "PUT",
            f"personas/{persona_id}/activate",
            200
        )
        if success:
            _, active = self.run_test(
                "Verify custom persona is active",
                "GET",
                "personas/active",
                200
            )
            return active and active.get('id') == persona_id
        return False

    def test_personas_limit(self):
        """Test custom persona limit (5 max)"""
        self.log("=== PERSONAS: Limit Enforcement ===", "SECTION")
        created_ids = []
        
        # Create 5 custom personas
        for i in range(5):
            desc = f"Test persona {i+1} for limit testing. Unique personality with specific traits."
            _, gen = self.run_test(
                f"Generate persona {i+1}/5",
                "POST",
                "personas/generate",
                200,
                data={"description": desc}
            )
            if gen:
                save_data = {
                    "name": f"Test Persona {i+1}",
                    "personality_summary": gen.get('personality_summary', 'Test'),
                    "communication_style": gen.get('communication_style', 'casual'),
                    "tone_tags": gen.get('tone_tags', []),
                    "system_prompt": gen.get('system_prompt_fragment', 'Test prompt'),
                }
                _, saved = self.run_test(
                    f"Save persona {i+1}/5",
                    "POST",
                    "personas",
                    200,
                    data=save_data
                )
                if saved and 'id' in saved:
                    created_ids.append(saved['id'])
        
        # Try to create 6th - should fail with 400
        desc = "Sixth persona that should fail due to limit"
        _, gen = self.run_test(
            "Generate 6th persona",
            "POST",
            "personas/generate",
            200,
            data={"description": desc}
        )
        if gen:
            save_data = {
                "name": "Sixth Persona",
                "personality_summary": gen.get('personality_summary', 'Test'),
                "communication_style": gen.get('communication_style', 'casual'),
                "tone_tags": gen.get('tone_tags', []),
                "system_prompt": gen.get('system_prompt_fragment', 'Test'),
            }
            success, response = self.run_test(
                "Save 6th persona (should fail with 400 PERSONA_LIMIT_REACHED)",
                "POST",
                "personas",
                400,
                data=save_data
            )
            limit_enforced = success and 'PERSONA_LIMIT_REACHED' in str(response)
            
            # Cleanup - delete created personas
            for pid in created_ids:
                self.run_test(
                    f"Delete test persona {pid[:8]}",
                    "DELETE",
                    f"personas/{pid}",
                    200
                )
            
            return limit_enforced
        return False

    def test_personas_delete(self, persona_id: str):
        """Test deleting a custom persona"""
        success, _ = self.run_test(
            "Delete custom persona",
            "DELETE",
            f"personas/{persona_id}",
            200
        )
        return success

    def test_personas_from_file(self):
        """Test persona generation from file"""
        self.log("=== PERSONAS: From File ===", "SECTION")
        # Create a small text file
        file_content = b"I love adventure and exploring new places. I'm energetic, curious, and always ready for a challenge. I enjoy deep conversations about philosophy and science."
        
        files = {
            'file': ('test_persona.txt', io.BytesIO(file_content), 'text/plain')
        }
        
        success, response = self.run_test(
            "Generate persona from TXT file",
            "POST",
            "personas/from-file",
            200,
            files=files
        )
        if success:
            required_keys = ['name', 'personality_summary', 'system_prompt_fragment', 'source_file_id']
            has_all = all(k in response for k in required_keys)
            if has_all:
                self.log(f"   Generated from file: {response.get('name')}", "INFO")
                return True
        return False

    def test_files_upload_download(self):
        """Test file upload and download"""
        self.log("=== FILES: Upload/Download ===", "SECTION")
        # Create a tiny test image (1x1 PNG)
        png_bytes = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
        
        files = {
            'file': ('avatar.png', io.BytesIO(png_bytes), 'image/png')
        }
        data = {'purpose': 'avatar'}
        
        success, response = self.run_test(
            "Upload avatar image",
            "POST",
            "files/upload",
            200,
            files=files,
            data=data
        )
        
        if success and 'file_id' in response:
            file_id = response['file_id']
            self.log(f"   File ID: {file_id}", "INFO")
            
            # Download it back
            download_success, _ = self.run_test(
                "Download uploaded file",
                "GET",
                f"files/{file_id}",
                200
            )
            return download_success
        return False

    def test_sessions_start_with_persona(self):
        """Test starting a session with a persona"""
        self.log("=== SESSIONS: Start with Persona ===", "SECTION")
        # Get active persona
        _, active = self.run_test(
            "Get active persona for session",
            "GET",
            "personas/active",
            200
        )
        
        persona_id = active.get('id') if active else None
        success, response = self.run_test(
            "Start session with persona",
            "POST",
            "sessions",
            200,
            data={"persona_id": persona_id, "language": "en"}
        )
        
        if success and 'session_id' in response:
            session_id = response['session_id']
            self.log(f"   Session ID: {session_id}", "INFO")
            greeting = response.get('greeting') or 'N/A'
            self.log(f"   Greeting: {greeting[:80] if isinstance(greeting, str) else greeting}", "INFO")
            return session_id
        return None

    def test_sessions_turn(self, session_id: str):
        """Test adding a turn to session"""
        success, response = self.run_test(
            "Add turn to session",
            "POST",
            f"sessions/{session_id}/turn",
            200,
            data={
                "text": "Hello there, how are you today?",
                "language": "en",
                "latency_ms": 500,
                "silence_seconds": 5,
                "speech_energy": 0.7
            }
        )
        
        if success:
            self.log(f"   AI Reply: {response.get('ai_reply', 'N/A')[:80]}", "INFO")
            self.log(f"   Drowsiness Score: {response.get('drowsiness_score', 0)}", "INFO")
            self.log(f"   Severity: {response.get('severity', 'N/A')}", "INFO")
            return True
        return False

    def test_sessions_drowsiness_detection(self, session_id: str):
        """Test drowsiness detection with high latency and silence"""
        success, response = self.run_test(
            "Turn with high drowsiness indicators",
            "POST",
            f"sessions/{session_id}/turn",
            200,
            data={
                "text": "I'm feeling a bit tired...",
                "language": "en",
                "latency_ms": 8000,
                "silence_seconds": 150,
                "speech_energy": 0.1
            }
        )
        
        if success:
            score = response.get('drowsiness_score', 0)
            severity = response.get('severity', 'normal')
            self.log(f"   Drowsiness Score: {score}", "INFO")
            self.log(f"   Severity: {severity}", "INFO")
            # Should trigger warning or danger
            return severity in ['warning', 'danger'] and score > 70
        return False

    def test_sessions_end(self, session_id: str):
        """Test ending a session"""
        success, response = self.run_test(
            "End session",
            "PUT",
            f"sessions/{session_id}/end",
            200
        )
        if success:
            self.log(f"   Duration: {response.get('duration_seconds', 0)}s", "INFO")
            return True
        return False

    def test_sessions_report(self, session_id: str):
        """Test getting session report"""
        # Force analysis to run synchronously
        self.log("   Running post-session analysis...", "INFO")
        self.run_test(
            "Force run analysis",
            "POST",
            f"sessions/{session_id}/run-analysis",
            200
        )
        
        # Get report
        success, response = self.run_test(
            "Get session report",
            "GET",
            f"sessions/{session_id}/report",
            200
        )
        
        if success and 'report' in response:
            report = response['report']
            self.log(f"   Total Turns: {report.get('total_turns', 0)}", "INFO")
            self.log(f"   Engagement Score: {report.get('engagement_score', 0)}", "INFO")
            self.log(f"   Emotional Tone: {report.get('emotional_tone', 'N/A')}", "INFO")
            self.log(f"   Topics: {', '.join(report.get('topics', []))}", "INFO")
            return True
        return False

    def test_sessions_auto_persona(self):
        """Test auto-persona generation from session without persona"""
        self.log("=== SESSIONS: Auto-Persona Generation ===", "SECTION")
        # Start session WITHOUT persona_id
        success, response = self.run_test(
            "Start session without persona",
            "POST",
            "sessions",
            200,
            data={"language": "en"}
        )
        
        if not success or 'session_id' not in response:
            return False
        
        session_id = response['session_id']
        self.log(f"   Session ID: {session_id}", "INFO")
        
        # Do at least 4 turns
        turns = [
            "hello",
            "how are you",
            "tell me a joke",
            "I'm tired"
        ]
        
        for i, text in enumerate(turns):
            self.run_test(
                f"Turn {i+1}/4: '{text}'",
                "POST",
                f"sessions/{session_id}/turn",
                200,
                data={"text": text, "language": "en"}
            )
        
        # End session
        self.test_sessions_end(session_id)
        
        # Force analysis
        self.run_test(
            "Force analysis for auto-persona",
            "POST",
            f"sessions/{session_id}/run-analysis",
            200
        )
        
        # Check for auto_persona_draft
        success, response = self.run_test(
            "Get report with auto_persona_draft",
            "GET",
            f"sessions/{session_id}/report",
            200
        )
        
        if success and 'auto_persona_draft' in response and response['auto_persona_draft']:
            draft = response['auto_persona_draft']
            self.log(f"   Auto-persona: {draft.get('name', 'N/A')}", "INFO")
            
            # Accept the auto-persona
            accept_success, persona = self.run_test(
                "Accept auto-persona",
                "POST",
                f"sessions/{session_id}/accept-auto-persona",
                200
            )
            
            if accept_success and persona.get('type') == 'auto':
                self.log(f"   Created auto-persona: {persona.get('name')}", "INFO")
                return True
        return False

    def test_profile_update(self):
        """Test profile update"""
        self.log("=== PROFILE: Update ===", "SECTION")
        success, response = self.run_test(
            "Update profile (name, language)",
            "PUT",
            "auth/profile",
            200,
            data={
                "full_name": "E2E Tester Updated",
                "language": "id"
            }
        )
        
        if success:
            self.log(f"   Updated name: {response.get('full_name')}", "INFO")
            self.log(f"   Updated language: {response.get('language')}", "INFO")
            return response.get('full_name') == "E2E Tester Updated" and response.get('language') == "id"
        return False

    def run_all_tests(self):
        """Run all backend tests"""
        self.log("=" * 60, "HEADER")
        self.log("DrivoAI Backend API Test Suite", "HEADER")
        self.log(f"Base URL: {self.base_url}", "HEADER")
        self.log("=" * 60, "HEADER")
        
        # AUTH Tests
        if not self.test_auth_register():
            self.log("Registration failed - stopping tests", "FAIL")
            return False
        
        self.test_auth_weak_password()
        self.test_auth_login()
        self.test_auth_me()
        
        # PERSONAS Tests
        self.test_personas_templates()
        self.test_personas_activate_template()
        
        custom_persona_id = self.test_personas_save_custom()
        if custom_persona_id:
            self.test_personas_activate_custom(custom_persona_id)
        
        self.test_personas_from_file()
        self.test_personas_limit()
        
        if custom_persona_id:
            self.test_personas_delete(custom_persona_id)
        
        # FILES Tests
        self.test_files_upload_download()
        
        # SESSIONS Tests
        session_id = self.test_sessions_start_with_persona()
        if session_id:
            self.test_sessions_turn(session_id)
            self.test_sessions_drowsiness_detection(session_id)
            self.test_sessions_end(session_id)
            self.test_sessions_report(session_id)
        
        # Auto-persona test
        self.test_sessions_auto_persona()
        
        # PROFILE Tests
        self.test_profile_update()
        
        # Summary
        self.log("=" * 60, "HEADER")
        self.log("TEST SUMMARY", "HEADER")
        self.log("=" * 60, "HEADER")
        self.log(f"Total Tests: {self.tests_run}", "SUMMARY")
        self.log(f"Passed: {self.tests_passed} ✅", "SUMMARY")
        self.log(f"Failed: {self.tests_failed} ❌", "SUMMARY")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        self.log(f"Success Rate: {success_rate:.1f}%", "SUMMARY")
        self.log("=" * 60, "HEADER")
        
        return self.tests_failed == 0


def main():
    tester = DrivoAITester()
    success = tester.run_all_tests()
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
