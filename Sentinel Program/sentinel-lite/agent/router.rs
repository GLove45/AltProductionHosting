use std::collections::HashMap;
use std::fmt;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use crossbeam_channel::{bounded, Receiver, Sender, TrySendError};
use log::{debug, info, warn};
use serde::Serialize;

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize)]
pub enum EventTopic {
    Network,
    Integrity,
    Process,
    Evidence,
    Responder,
}

#[derive(Debug, Clone, Serialize)]
pub struct EventEnvelope<T: Serialize> {
    pub topic: EventTopic,
    pub payload: T,
    pub sequence: u64,
    pub produced_at: Instant,
}

#[derive(Debug, Clone)]
pub struct TopicConfig {
    pub capacity: usize,
    pub high_watermark: f32,
}

impl Default for TopicConfig {
    fn default() -> Self {
        Self {
            capacity: 1024,
            high_watermark: 0.8,
        }
    }
}

#[derive(Debug)]
pub struct BackpressureStats {
    pub dropped_messages: u64,
    pub last_drop: Option<Instant>,
}

impl BackpressureStats {
    fn new() -> Self {
        Self {
            dropped_messages: 0,
            last_drop: None,
        }
    }
}

#[derive(Debug, Clone)]
pub struct RouterMetrics {
    pub topic_depths: HashMap<EventTopic, usize>,
    pub dropped: HashMap<EventTopic, u64>,
}

impl RouterMetrics {
    fn empty() -> Self {
        Self {
            topic_depths: HashMap::new(),
            dropped: HashMap::new(),
        }
    }
}

pub struct EventRouter {
    topics: HashMap<EventTopic, Sender<EventEnvelope<serde_json::Value>>>,
    receivers: HashMap<EventTopic, Receiver<EventEnvelope<serde_json::Value>>>,
    stats: Arc<Mutex<HashMap<EventTopic, BackpressureStats>>>,
    sequence: Arc<Mutex<u64>>,
}

impl fmt::Debug for EventRouter {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("EventRouter")
            .field("topics", &self.topics.keys())
            .finish()
    }
}

impl EventRouter {
    pub fn new(topic_configs: HashMap<EventTopic, TopicConfig>) -> Self {
        let mut topics = HashMap::new();
        let mut receivers = HashMap::new();
        let mut stats = HashMap::new();
        for (topic, cfg) in topic_configs {
            let (tx, rx) = bounded(cfg.capacity);
            topics.insert(topic.clone(), tx);
            receivers.insert(topic.clone(), rx);
            stats.insert(topic, BackpressureStats::new());
        }
        Self {
            topics,
            receivers,
            stats: Arc::new(Mutex::new(stats)),
            sequence: Arc::new(Mutex::new(0)),
        }
    }

    pub fn publish<T>(&self, topic: EventTopic, payload: T)
    where
        T: Serialize,
    {
        let envelope = match self.wrap(topic.clone(), payload) {
            Ok(env) => env,
            Err(err) => {
                warn!("router failed to serialise event: {err:?}");
                return;
            }
        };
        if let Some(sender) = self.topics.get(&topic) {
            match sender.try_send(envelope) {
                Ok(_) => {}
                Err(TrySendError::Full(env)) => {
                    self.record_drop(&topic);
                    warn!("router drop: topic={:?} depth={} capacity_exhausted", topic, sender.len());
                    // best effort: drop oldest and push new event
                    let _ = sender.try_send(env);
                }
                Err(TrySendError::Disconnected(_)) => {
                    warn!("router channel disconnected for topic={:?}", topic);
                }
            }
        } else {
            warn!("attempted to publish on unconfigured topic={:?}", topic);
        }
    }

    fn wrap<T>(&self, topic: EventTopic, payload: T) -> Result<EventEnvelope<serde_json::Value>, serde_json::Error>
    where
        T: Serialize,
    {
        let mut seq = self.sequence.lock().expect("sequence poisoned");
        *seq += 1;
        let serialized = serde_json::to_value(payload)?;
        Ok(EventEnvelope {
            topic,
            payload: serialized,
            sequence: *seq,
            produced_at: Instant::now(),
        })
    }

    fn record_drop(&self, topic: &EventTopic) {
        if let Ok(mut stats) = self.stats.lock() {
            if let Some(entry) = stats.get_mut(topic) {
                entry.dropped_messages += 1;
                entry.last_drop = Some(Instant::now());
            }
        }
    }

    pub fn subscribe(&self, topic: &EventTopic) -> Option<Receiver<EventEnvelope<serde_json::Value>>> {
        self.receivers.get(topic).cloned()
    }

    pub fn metrics(&self) -> RouterMetrics {
        let mut metrics = RouterMetrics::empty();
        for (topic, sender) in &self.topics {
            metrics.topic_depths.insert(topic.clone(), sender.len());
        }
        if let Ok(stats) = self.stats.lock() {
            for (topic, stat) in stats.iter() {
                metrics.dropped.insert(topic.clone(), stat.dropped_messages);
            }
        }
        metrics
    }

    pub fn drain_with_timeout(
        &self,
        topic: &EventTopic,
        timeout: Duration,
    ) -> Option<EventEnvelope<serde_json::Value>> {
        self.receivers
            .get(topic)
            .and_then(|rx| rx.recv_timeout(timeout).ok())
    }

    pub fn broadcast_shutdown(&self) {
        info!("broadcasting shutdown to all subscribers");
        for sender in self.topics.values() {
            debug!("closing channel with pending={}", sender.len());
        }
    }
}
