from __future__ import annotations

from app_runtime import PermissionModel, ZionRuntime
from modules import (
    AdminConsoleModule,
    AdvancedMFAModule,
    CommsConnectorModule,
    DeviceHealthModule,
    SentinelLiteModule,
    WellbeingModule,
)
from policy_bus import PolicyBus, SchemaRegistry, SignatureAuthority
from system_services import IdentityProvisioningService, NetworkEnforcementService, OTAUpdateService, PolicySyncService


def bootstrap_runtime() -> ZionRuntime:
    registry = SchemaRegistry.default()
    authority = SignatureAuthority()
    bus = PolicyBus(registry=registry, authority=authority)

    permissions = PermissionModel.hardened_default()
    permissions.allow(module="admin_console", publish={"audit.events"}, subscribe={"policy.commands"})
    permissions.allow(module="advanced_mfa", publish={"mfa.challenge", "audit.events"}, subscribe={"mfa.challenge"})
    permissions.allow(module="comms_connector", publish={"network.alert", "audit.events"})
    permissions.allow(module="device_health", publish={"health.metrics", "audit.events"})
    permissions.allow(module="sentinel_lite", publish={"audit.events"})
    permissions.allow(module="wellbeing", publish={"telemetry.device", "audit.events"})

    runtime = ZionRuntime(bus=bus, permissions=permissions)
    runtime.register(AdminConsoleModule())
    runtime.register(AdvancedMFAModule())
    runtime.register(CommsConnectorModule())
    runtime.register(DeviceHealthModule())
    runtime.register(SentinelLiteModule())
    runtime.register(WellbeingModule())

    runtime.start()
    return runtime


def bootstrap_system_services(bus: PolicyBus, registry: SchemaRegistry) -> dict[str, object]:
    identity = IdentityProvisioningService()
    network = NetworkEnforcementService()
    ota = OTAUpdateService()
    policy = PolicySyncService(bus=bus, registry=registry)

    policy.register_topic("policy.commands", "policy.commands")
    policy.register_topic("audit.events", "audit.events")
    policy.register_topic("telemetry.device", "telemetry.device")
    policy.register_topic("health.metrics", "health.metrics")
    policy.register_topic("mfa.challenge", "mfa.challenge")
    policy.register_topic("network.alert", "network.alert")
    policy.register_topic("auth.decision", "auth.decision")

    network.add_rule("allow_policy_bus", "policy-bus", "allow")
    network.add_rule("deny_unknown", "*", "deny")

    return {
        "identity": identity,
        "network": network,
        "ota": ota,
        "policy": policy,
    }


if __name__ == "__main__":
    runtime = bootstrap_runtime()
    services = bootstrap_system_services(runtime.bus, runtime.bus.registry)

    identity: IdentityProvisioningService = services["identity"]  # type: ignore[assignment]
    identity.enroll("alice", "device-1", strongbox_key="sb-123")

    wellbeing: WellbeingModule = runtime.get_module("wellbeing")  # type: ignore[assignment]
    wellbeing.toggle(True)
    wellbeing.record_metric("screen_time", 120.0)

    device_health: DeviceHealthModule = runtime.get_module("device_health")  # type: ignore[assignment]
    device_health.run_diagnostics({"battery_temperature": 48.0})

    runtime.run_cycle()
