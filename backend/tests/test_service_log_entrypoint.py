import os
import subprocess
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
ENTRYPOINT = PROJECT_ROOT / "scripts" / "service-log-entrypoint.sh"


def test_service_log_entrypoint_flushes_stdout_before_exit(tmp_path: Path) -> None:
    log_path = tmp_path / "service.log"
    env = {**os.environ, "SERVICE_LOG_PATH": str(log_path)}

    result = subprocess.run(
        [
            "sh",
            str(ENTRYPOINT),
            "sh",
            "-c",
            "printf 'service-log-probe\\n'",
        ],
        check=True,
        capture_output=True,
        env=env,
        text=True,
    )

    assert result.stdout == "service-log-probe\n"
    assert log_path.read_text(encoding="utf-8") == "service-log-probe\n"
