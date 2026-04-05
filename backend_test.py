#!/usr/bin/env python3
"""
MzansiBuilds Backend API Testing Suite
Tests all API endpoints for the MzansiBuilds platform
"""

import requests
import sys
import json
from datetime import datetime

class MzansiBuildsAPITester:
    def __init__(self, base_url="http://127.0.0.1:8000"):
        self.base_url = base_url
        self.session = requests.Session()  # Use session to handle cookies
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.user_id = None
        self.project_id = None
        self.milestone_id = None
        self.update_id = None
        self.comment_id = None
        self.collab_id = None

    def log_test(self, name, success, details="", endpoint=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "name": name,
            "success": success,
            "details": details,
            "endpoint": endpoint
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = self.session.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PATCH':
                response = self.session.patch(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                details += f" (expected {expected_status})"
                try:
                    error_data = response.json()
                    if 'detail' in error_data:
                        details += f" - {error_data['detail']}"
                except:
                    details += f" - {response.text[:100]}"

            self.log_test(name, success, details, endpoint)
            
            return success, response.json() if success and response.content else {}

        except Exception as e:
            self.log_test(name, False, f"Error: {str(e)}", endpoint)
            return False, {}

    def test_health_check(self):
        """Test health endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "health",
            200
        )
        return success

    def test_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@mzansibuilds.com", "password": "Admin@123"}
        )
        
        if success and 'user' in response:
            self.user_id = response['user']['id']
            # Note: Access token should be in httpOnly cookie, not response body
            print(f"   User ID: {self.user_id}")
            return True
        return False

    def test_get_me(self):
        """Test get current user"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_create_project(self):
        """Test project creation"""
        project_data = {
            "title": f"Test Project {datetime.now().strftime('%H%M%S')}",
            "description": "A test project for API testing",
            "tech_stack": ["Python", "FastAPI", "React"],
            "stage": "idea",
            "support_needed": "Looking for frontend developers"
        }
        
        success, response = self.run_test(
            "Create Project",
            "POST",
            "projects",
            200,
            data=project_data
        )
        
        if success and 'id' in response:
            self.project_id = response['id']
            print(f"   Project ID: {self.project_id}")
            return True
        return False

    def test_list_projects(self):
        """Test listing projects"""
        success, response = self.run_test(
            "List Projects",
            "GET",
            "projects",
            200
        )
        return success

    def test_get_project(self):
        """Test getting specific project"""
        if not self.project_id:
            self.log_test("Get Project", False, "No project ID available", "projects/{id}")
            return False
            
        success, response = self.run_test(
            "Get Project",
            "GET",
            f"projects/{self.project_id}",
            200
        )
        return success

    def test_my_projects(self):
        """Test getting user's projects"""
        success, response = self.run_test(
            "Get My Projects",
            "GET",
            "my/projects",
            200
        )
        return success

    def test_create_project_update(self):
        """Test creating project update"""
        if not self.project_id:
            self.log_test("Create Project Update", False, "No project ID available", "projects/{id}/updates")
            return False
            
        update_data = {
            "content": f"Test update created at {datetime.now().isoformat()}"
        }
        
        success, response = self.run_test(
            "Create Project Update",
            "POST",
            f"projects/{self.project_id}/updates",
            200,
            data=update_data
        )
        
        if success and 'id' in response:
            self.update_id = response['id']
            return True
        return False

    def test_get_project_updates(self):
        """Test getting project updates"""
        if not self.project_id:
            self.log_test("Get Project Updates", False, "No project ID available", "projects/{id}/updates")
            return False
            
        success, response = self.run_test(
            "Get Project Updates",
            "GET",
            f"projects/{self.project_id}/updates",
            200
        )
        return success

    def test_create_milestone(self):
        """Test creating milestone"""
        if not self.project_id:
            self.log_test("Create Milestone", False, "No project ID available", "projects/{id}/milestones")
            return False
            
        milestone_data = {
            "title": f"Test Milestone {datetime.now().strftime('%H%M%S')}"
        }
        
        success, response = self.run_test(
            "Create Milestone",
            "POST",
            f"projects/{self.project_id}/milestones",
            200,
            data=milestone_data
        )
        
        if success and 'id' in response:
            self.milestone_id = response['id']
            return True
        return False

    def test_update_milestone(self):
        """Test updating milestone completion"""
        if not self.milestone_id:
            self.log_test("Update Milestone", False, "No milestone ID available", "milestones/{id}")
            return False
            
        success, response = self.run_test(
            "Update Milestone",
            "PATCH",
            f"milestones/{self.milestone_id}",
            200,
            data={"is_completed": True}
        )
        return success

    def test_get_project_milestones(self):
        """Test getting project milestones"""
        if not self.project_id:
            self.log_test("Get Project Milestones", False, "No project ID available", "projects/{id}/milestones")
            return False
            
        success, response = self.run_test(
            "Get Project Milestones",
            "GET",
            f"projects/{self.project_id}/milestones",
            200
        )
        return success

    def test_create_comment(self):
        """Test creating project comment"""
        if not self.project_id:
            self.log_test("Create Comment", False, "No project ID available", "projects/{id}/comments")
            return False
            
        comment_data = {
            "content": f"Test comment created at {datetime.now().isoformat()}"
        }
        
        success, response = self.run_test(
            "Create Comment",
            "POST",
            f"projects/{self.project_id}/comments",
            200,
            data=comment_data
        )
        
        if success and 'id' in response:
            self.comment_id = response['id']
            return True
        return False

    def test_get_project_comments(self):
        """Test getting project comments"""
        if not self.project_id:
            self.log_test("Get Project Comments", False, "No project ID available", "projects/{id}/comments")
            return False
            
        success, response = self.run_test(
            "Get Project Comments",
            "GET",
            f"projects/{self.project_id}/comments",
            200
        )
        return success

    def test_get_feed(self):
        """Test getting activity feed"""
        success, response = self.run_test(
            "Get Feed",
            "GET",
            "feed",
            200
        )
        return success

    def test_get_celebration(self):
        """Test getting celebration wall"""
        success, response = self.run_test(
            "Get Celebration Wall",
            "GET",
            "celebration",
            200
        )
        return success

    def test_complete_project(self):
        """Test completing project"""
        if not self.project_id:
            self.log_test("Complete Project", False, "No project ID available", "projects/{id}/complete")
            return False
            
        success, response = self.run_test(
            "Complete Project",
            "PATCH",
            f"projects/{self.project_id}/complete",
            200
        )
        return success

    def test_profile_endpoints(self):
        """Test profile endpoints"""
        # Get profile
        success1, response = self.run_test(
            "Get Profile",
            "GET",
            "profile",
            200
        )
        
        # Update profile
        profile_data = {
            "bio": "Test bio for API testing",
            "skills": ["Python", "JavaScript", "React"],
            "github_url": "https://github.com/testuser"
        }
        
        success2, response = self.run_test(
            "Update Profile",
            "PUT",
            "profile",
            200,
            data=profile_data
        )
        
        return success1 and success2

    def test_logout(self):
        """Test logout"""
        success, response = self.run_test(
            "Logout",
            "POST",
            "auth/logout",
            200
        )
        return success

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting MzansiBuilds API Tests")
        print("=" * 50)
        
        # Health check
        if not self.test_health_check():
            print("❌ Health check failed, stopping tests")
            return False
        
        # Authentication tests
        if not self.test_login():
            print("❌ Login failed, stopping tests")
            return False
        
        self.test_get_me()
        
        # Project tests
        if self.test_create_project():
            self.test_get_project()
            self.test_list_projects()
            self.test_my_projects()
            
            # Project updates
            if self.test_create_project_update():
                self.test_get_project_updates()
            
            # Milestones
            if self.test_create_milestone():
                self.test_update_milestone()
                self.test_get_project_milestones()
            
            # Comments
            if self.test_create_comment():
                self.test_get_project_comments()
            
            # Complete project
            self.test_complete_project()
        
        # Feed and celebration
        self.test_get_feed()
        self.test_get_celebration()
        
        # Profile
        self.test_profile_endpoints()
        
        # Logout
        self.test_logout()
        
        # Print summary
        print("\n" + "=" * 50)
        print(f"📊 Tests completed: {self.tests_passed}/{self.tests_run}")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    """Main test runner"""
    tester = MzansiBuildsAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump({
            'summary': {
                'total_tests': tester.tests_run,
                'passed_tests': tester.tests_passed,
                'success_rate': f"{(tester.tests_passed/tester.tests_run*100):.1f}%" if tester.tests_run > 0 else "0%",
                'timestamp': datetime.now().isoformat()
            },
            'results': tester.test_results
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())