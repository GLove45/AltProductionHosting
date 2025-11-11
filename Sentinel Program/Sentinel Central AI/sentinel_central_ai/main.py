"""Entry point for running a local Sentinel Central AI simulation."""

from __future__ import annotations

from datetime import UTC, datetime

from .bootstrap import bootstrap_environment
from .learning.feedback import FeedbackRecord


def run_demo() -> None:
    """Run a demonstration loop producing verbose telemetry."""

    context = bootstrap_environment()
    # Simulate ingest + inference + policy evaluation
    feature_window = context.ingest_pipeline.pump()
    batch = context.inference_engine.score()
    decision = context.coordinator.evaluate(batch.scores)

    # Simulate operator feedback
    feedback = FeedbackRecord(
        decision_id="demo-1",
        actor="operator@studio",
        verdict="require_elevated" if decision.action != "allow" else "allow",
        rationale=decision.rationale,
        timestamp=datetime.now(UTC),
        feature_vector=feature_window.features,
        rule_hits=[hit.tripwire for hit in decision.rule_hits],
    )
    context.coordinator.log_feedback(feedback)

    suggestions = context.feedback_loop.suggestions()
    print("Policy decision:", decision)
    print("Suggestions:", suggestions)


if __name__ == "__main__":
    run_demo()
