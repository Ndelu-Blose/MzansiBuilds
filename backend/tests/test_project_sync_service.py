from project_sync_service import detect_frameworks


def test_detect_frameworks_core_stack():
    file_names = [
        "package.json",
        "next.config.js",
        "tsconfig.json",
        "tailwind.config.js",
        "Dockerfile",
        ".github",
    ]
    frameworks = detect_frameworks(file_names)
    assert "Next.js" in frameworks
    assert "React" in frameworks
    assert "TypeScript" in frameworks
    assert "Tailwind" in frameworks
    assert "Docker" in frameworks
    assert "GitHub Actions" in frameworks


def test_detect_frameworks_python_stack():
    file_names = ["pyproject.toml", "requirements.txt", "main.py"]
    frameworks = detect_frameworks(file_names)
    assert "Python" in frameworks
    assert "FastAPI" in frameworks
