from pathlib import Path

import yaml


PROJECT_ROOT = Path(__file__).resolve().parents[2]


def test_compose_persists_service_stdout_logs_to_project_data() -> None:
    compose = yaml.safe_load((PROJECT_ROOT / "docker-compose.yml").read_text())
    services = compose["services"]

    expected_log_paths = {
        "postgres": "/project_data/logs/postgres.log",
        "backend": "/project_data/logs/backend.log",
        "frontend": "/project_data/logs/frontend.log",
        "bot": "/project_data/logs/bot.log",
    }

    for service_name, log_path in expected_log_paths.items():
        service = services[service_name]
        assert service["environment"]["SERVICE_LOG_PATH"] == log_path
        assert "./project_data/logs:/project_data/logs" in service["volumes"]
        assert (
            "./scripts/service-log-entrypoint.sh:"
            "/usr/local/bin/service-log-entrypoint.sh:ro"
        ) in service["volumes"]

    for service_name in expected_log_paths:
        assert services[service_name]["entrypoint"][:2] == [
            "sh",
            "/usr/local/bin/service-log-entrypoint.sh",
        ]

    assert services["postgres"]["command"] == ["docker-entrypoint.sh", "postgres"]
    assert services["backend"]["command"] == ["/app/docker-entrypoint.sh"]
    assert services["frontend"]["command"] == [
        "docker-entrypoint.sh",
        "npm",
        "run",
        "dev",
        "--",
        "--host",
        "0.0.0.0",
        "--port",
        "5173",
    ]
    assert services["bot"]["command"] == [
        "uv",
        "run",
        "python",
        "-m",
        "app.bot",
    ]
