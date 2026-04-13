import json
import pytest
from pathlib import Path
from autoeval.config import load_config, build_easi_cmd_base, ConfigError


def _write_yaml(tmp_path, content: str) -> Path:
    p = tmp_path / "autoeval.yaml"
    p.write_text(content)
    return p


VALID_CONFIG = """\
target_dirs:
  - /tmp/checkpoints
output_dir: ./logs
results_dir: null
scan_interval: 300
zip_images: false
zip_all_images: false
tasks:
  - my_task
agent: react
backend: vllm
num_parallel: 8
sim_gpus: "0,1"
llm_instances: 1
llm_gpus: "2,3"
llm_kwargs:
  tensor_parallel_size: 2
  trust_remote_code: true
verbosity: TRACE
"""


def test_load_valid_config(tmp_path):
    path = _write_yaml(tmp_path, VALID_CONFIG)
    cfg = load_config(path)
    assert cfg["target_dirs"] == ["/tmp/checkpoints"]
    assert cfg["output_dir"] == "./logs"
    assert cfg["results_dir"] is None
    assert cfg["scan_interval"] == 300
    assert cfg["tasks"] == ["my_task"]
    assert cfg["agent"] == "react"
    assert cfg["backend"] == "vllm"
    assert cfg["num_parallel"] == 8
    assert cfg["llm_kwargs"]["tensor_parallel_size"] == 2


def test_load_missing_file(tmp_path):
    with pytest.raises(ConfigError, match="not found"):
        load_config(tmp_path / "nonexistent.yaml")


def test_load_malformed_yaml(tmp_path):
    path = _write_yaml(tmp_path, "target_dirs: [unclosed")
    with pytest.raises(ConfigError, match="parse"):
        load_config(path)


def test_load_missing_required_field(tmp_path):
    path = _write_yaml(tmp_path, "target_dirs:\n  - /tmp\n")
    cfg = load_config(path)
    assert cfg["tasks"] == []
    assert cfg["agent"] == "react"
    assert cfg["scan_interval"] == 600


def test_build_easi_cmd_base():
    cfg = {
        "agent": "react",
        "backend": "vllm",
        "num_parallel": 8,
        "sim_gpus": "0,1",
        "llm_instances": 1,
        "llm_gpus": "2,3",
        "llm_kwargs": {"tensor_parallel_size": 2, "trust_remote_code": True},
        "verbosity": "TRACE",
    }
    cmd = build_easi_cmd_base(cfg)
    assert cmd[:2] == ["easi", "start"]
    assert "--agent" in cmd
    assert cmd[cmd.index("--agent") + 1] == "react"
    assert "--num-parallel" in cmd
    assert cmd[cmd.index("--num-parallel") + 1] == "8"
    assert "--llm-kwargs" in cmd
    kwargs_idx = cmd.index("--llm-kwargs") + 1
    parsed = json.loads(cmd[kwargs_idx])
    assert parsed["tensor_parallel_size"] == 2


def test_build_easi_cmd_base_minimal():
    cfg = {
        "agent": "react",
        "backend": "vllm",
        "num_parallel": 1,
        "sim_gpus": None,
        "llm_instances": None,
        "llm_gpus": None,
        "llm_kwargs": {},
        "verbosity": None,
    }
    cmd = build_easi_cmd_base(cfg)
    assert "--sim-gpus" not in cmd
    assert "--llm-gpus" not in cmd
    assert "--llm-kwargs" not in cmd
    assert "--verbosity" not in cmd
