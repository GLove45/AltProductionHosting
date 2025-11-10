from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import List


@dataclass
class EvidenceRecord:
    module: str
    payload: dict
    received_at: datetime


class EvidenceIngestionPipeline:
    def __init__(self) -> None:
        self._records: List[EvidenceRecord] = []

    def ingest(self, module: str, payload: dict) -> EvidenceRecord:
        record = EvidenceRecord(module=module, payload=payload, received_at=datetime.utcnow())
        self._records.append(record)
        return record

    def query(self, module: str | None = None) -> List[EvidenceRecord]:
        if module is None:
            return list(self._records)
        return [record for record in self._records if record.module == module]
