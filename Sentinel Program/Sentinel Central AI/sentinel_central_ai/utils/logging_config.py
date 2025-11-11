"""Centralized logging configuration for the Sentinel Central AI stack."""

from __future__ import annotations

import logging
from logging import Logger
from typing import Dict

_VERBOSE_FORMAT = (
    "[%(asctime)s] [%(levelname)s] [%(name)s] "
    "%(message)s | ctx=%(sentinel_context)s"
)


class ContextFilter(logging.Filter):
    """Injects a default context payload so verbose logs never miss metadata."""

    def __init__(self, default_context: Dict[str, str] | None = None) -> None:
        super().__init__(name="sentinel")
        self._default_context = default_context or {"component": "bootstrap"}

    def filter(self, record: logging.LogRecord) -> bool:  # noqa: D401
        if not hasattr(record, "sentinel_context"):
            record.sentinel_context = self._default_context
        return True


def configure_logging(level: int = logging.DEBUG, context: Dict[str, str] | None = None) -> Logger:
    """Configure a root logger with ultra-verbose formatting.

    Parameters
    ----------
    level:
        The minimum log level for emitted records. Defaults to ``logging.DEBUG``.
    context:
        Optional default context that will be merged into every log entry.

    Returns
    -------
    logging.Logger
        The configured logger instance so callers can immediately emit signals.
    """

    logger = logging.getLogger("sentinel")
    if logger.handlers:
        return logger

    logger.setLevel(level)
    handler = logging.StreamHandler()
    formatter = logging.Formatter(_VERBOSE_FORMAT)
    handler.setFormatter(formatter)
    handler.addFilter(ContextFilter(default_context=context))
    logger.addHandler(handler)
    logger.propagate = False
    logger.debug("Logging configured", extra={"sentinel_context": context or {}})
    return logger
