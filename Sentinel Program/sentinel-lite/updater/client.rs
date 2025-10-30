//! Update client for Sentinel Lite agents.
//!
//! Responsibilities:
//! - Fetch signed update manifests from the trusted update service.
//! - Download artifacts into `bin/next/` using a blue/green deployment layout.
//! - Verify signatures and only promote updates after health checks pass.
//! - Roll back automatically when post-update probes fail.
//!
//! ## Key Components
//! * Manifest parser (TUF-inspired metadata with version counters and expiry).
//! * Signature verification using the configured trust store.
//! * Atomic symlink flipping to activate the new version.
//! * Health check runner to confirm agent readiness before commit.
//!
//! ## Research Topics
//! * How closely to model The Update Framework (TUF) roles and metadata.
//! * Strategies for storing staged binaries securely on constrained devices.
//! * Integrating with existing watchdog infrastructure for health feedback.
//!
//! Implementation will follow once the team finalizes the update transport.
