from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import List


@dataclass
class BootArtifact:
    name: str
    path: Path
    digest: str


class VerifiedBootChain:
    """Manages boot metadata and verification digest computation."""

    def __init__(self, artifacts: List[BootArtifact] | None = None) -> None:
        self._artifacts = artifacts or []

    def add_artifact(self, artifact: BootArtifact) -> None:
        self._artifacts.append(artifact)

    def verify(self) -> bool:
        return all(artifact.path.exists() for artifact in self._artifacts)

    def summary(self) -> List[str]:
        return [f"{artifact.name}:{artifact.digest}" for artifact in self._artifacts]
