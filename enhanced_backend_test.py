#!/usr/bin/env python3
"""
Enhanced MzansiBuilds Backend API Testing Suite
Tests the new enhancement features: search, filtering, user profiles, etc.
"""

import requests
import sys
import json
from datetime import datetime

class EnhancedAPITester:
    def __init__(self, base_url="http://127.0.0.1:8000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.user_id = None
        self.project_ids = []

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

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        try:
            if method == 'GET':
                response = self.session.get(url, headers=headers, params=params, timeout=10)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=headers, timeout=10)

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
            return True
        return False

    def create_test_projects(self):
        """Create multiple test projects with different stages and tech stacks"""
        projects = [
            {
                "title": "React Dashboard App",
                "description": "Building a modern dashboard with React and TypeScript",
                "tech_stack": ["React", "TypeScript", "Tailwind"],
                "stage": "in_progress",
                "support_needed": "Looking for backend developers"
            },
            {
                "title": "Python API Service",
                "description": "FastAPI microservice for data processing",
                "tech_stack": ["Python", "FastAPI", "PostgreSQL"],
                "stage": "idea",
                "support_needed": None
            },
            {
                "title": "Mobile App with React Native",
                "description": "Cross-platform mobile application",
                "tech_stack": ["React Native", "Node.js", "MongoDB"],
                "stage": "testing",
                "support_needed": "Need help with testing"
            },
            {
                "title": "E-commerce Platform",
                "description": "Full-stack e-commerce solution",
                "tech_stack": ["Next.js", "PostgreSQL", "Stripe"],
                "stage": "completed",
                "support_needed": None
            }
        ]
        
        for project_data in projects:
            success, response = self.run_test(
                f"Create Project: {project_data['title']}",
                "POST",
                "projects",
                200,
                data=project_data
            )
            
            if success and 'id' in response:
                self.project_ids.append(response['id'])

    def test_search_functionality(self):
        """Test search by project title"""
        # Search for "React" projects
        success, response = self.run_test(
            "Search Projects by Title (React)",
            "GET",
            "projects",
            200,
            params={"search": "React"}
        )
        
        if success:
            items = response.get('items', [])
            react_projects = [p for p in items if 'React' in p.get('title', '')]
            if len(react_projects) > 0:
                print(f"   Found {len(react_projects)} React projects")
                return True
            else:
                self.log_test("Search Results Validation", False, "No React projects found in search results")
                return False
        return False

    def test_stage_filtering(self):
        """Test filtering by project stage"""
        stages = ["idea", "in_progress", "testing", "completed"]
        
        for stage in stages:
            success, response = self.run_test(
                f"Filter by Stage: {stage}",
                "GET",
                "projects",
                200,
                params={"stage": stage}
            )
            
            if success:
                items = response.get('items', [])
                stage_projects = [p for p in items if p.get('stage') == stage]
                print(f"   Found {len(stage_projects)} projects in {stage} stage")

    def test_tech_filtering(self):
        """Test filtering by technology"""
        techs = ["React", "Python", "TypeScript"]
        
        for tech in techs:
            success, response = self.run_test(
                f"Filter by Tech: {tech}",
                "GET",
                "projects",
                200,
                params={"tech": tech}
            )
            
            if success:
                items = response.get('items', [])
                print(f"   Found {len(items)} projects using {tech}")

    def test_sorting(self):
        """Test sorting functionality"""
        sorts = ["recent", "active"]
        
        for sort_type in sorts:
            success, response = self.run_test(
                f"Sort by: {sort_type}",
                "GET",
                "projects",
                200,
                params={"sort": sort_type}
            )
            
            if success:
                items = response.get('items', [])
                print(f"   Retrieved {len(items)} projects sorted by {sort_type}")

    def test_user_profile_with_stats(self):
        """Test user profile endpoint with stats"""
        if not self.user_id:
            self.log_test("User Profile Test", False, "No user ID available")
            return False
            
        success, response = self.run_test(
            "Get User Profile with Stats",
            "GET",
            f"users/{self.user_id}/profile",
            200
        )
        
        if success:
            # Check if stats are present
            stats = response.get('stats', {})
            required_stats = ['total_projects', 'active_projects', 'completed_projects']
            
            for stat in required_stats:
                if stat not in stats:
                    self.log_test("Profile Stats Validation", False, f"Missing stat: {stat}")
                    return False
            
            print(f"   Stats: Total={stats.get('total_projects')}, Active={stats.get('active_projects')}, Completed={stats.get('completed_projects')}")
            
            # Check if recent projects are present
            recent_projects = response.get('recent_projects', [])
            print(f"   Recent projects: {len(recent_projects)}")
            
            return True
        return False

    def test_combined_filters(self):
        """Test combining multiple filters"""
        success, response = self.run_test(
            "Combined Filters (React + in_progress)",
            "GET",
            "projects",
            200,
            params={"search": "React", "stage": "in_progress"}
        )
        
        if success:
            items = response.get('items', [])
            print(f"   Found {len(items)} React projects in progress")

    def run_enhancement_tests(self):
        """Run all enhancement-specific tests"""
        print("🚀 Starting MzansiBuilds Enhancement Tests")
        print("=" * 50)
        
        # Login first
        if not self.test_login():
            print("❌ Login failed, stopping tests")
            return False
        
        # Create test data
        print("\n📝 Creating test projects...")
        self.create_test_projects()
        
        print("\n🔍 Testing search functionality...")
        self.test_search_functionality()
        
        print("\n🏷️ Testing stage filtering...")
        self.test_stage_filtering()
        
        print("\n💻 Testing tech filtering...")
        self.test_tech_filtering()
        
        print("\n📊 Testing sorting...")
        self.test_sorting()
        
        print("\n👤 Testing user profile with stats...")
        self.test_user_profile_with_stats()
        
        print("\n🔗 Testing combined filters...")
        self.test_combined_filters()
        
        # Print summary
        print("\n" + "=" * 50)
        print(f"📊 Enhancement tests completed: {self.tests_passed}/{self.tests_run}")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All enhancement tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    """Main test runner"""
    tester = EnhancedAPITester()
    success = tester.run_enhancement_tests()
    
    # Save detailed results
    with open('/app/enhanced_test_results.json', 'w') as f:
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