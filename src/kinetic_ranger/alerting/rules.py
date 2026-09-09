from __future__ import annotations

from kinetic_ranger.config import AlertConfig
from kinetic_ranger.models import AlertDecision, RadioObservation, ThreatEstimate


class AlertRuleEngine:
    def __init__(self, config: AlertConfig) -> None:
        self.config = config
        self._sustained_hits = 0
        self._cooldown_until_s = 0.0
        self._active = False

    def evaluate(self, estimate: ThreatEstimate, observation: RadioObservation) -> AlertDecision:
        timestamp_s = estimate.timestamp_s
        closing_fast = estimate.closing_rate_mps <= -self.config.min_closing_rate_mps
        confident = min(estimate.confidence, observation.confidence) >= self.config.min_confidence
        imminent = (
            estimate.time_to_impact_s is not None
            and estimate.time_to_impact_s <= self.config.tti_threshold_s
        )

        if closing_fast and confident and imminent:
            self._sustained_hits += 1
        else:
            self._sustained_hits = max(0, self._sustained_hits - 1)

        if self._active:
            clear = (
                not closing_fast
                or not confident
                or estimate.time_to_impact_s is None
                or estimate.time_to_impact_s > self.config.tti_threshold_s * self.config.clear_factor
            )
            if clear:
                self._active = False
                self._cooldown_until_s = timestamp_s + self.config.cooldown_s

        if (
            not self._active
            and timestamp_s >= self._cooldown_until_s
            and self._sustained_hits >= self.config.consecutive_hits
        ):
            self._active = True

        if self._active:
            if estimate.time_to_impact_s is not None and estimate.time_to_impact_s <= max(3.0, self.config.tti_threshold_s * 0.5):
                severity = "critical"
            else:
                severity = "warning"
            reason = "unknown radio closing rapidly"
        else:
            severity = "info"
            if not confident:
                reason = "tracking only: low confidence"
            elif not closing_fast:
                reason = "tracking only: not closing fast enough"
            elif not imminent:
                reason = "tracking only: impact not yet imminent"
            else:
                reason = "tracking only: building alert confidence"

        return AlertDecision(
            timestamp_s=timestamp_s,
            active=self._active,
            severity=severity,
            reason=reason,
            sustained_hits=self._sustained_hits,
            cooldown_remaining_s=max(0.0, self._cooldown_until_s - timestamp_s),
        )
