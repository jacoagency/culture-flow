# CulturaFlow Monitoring Dashboard Configuration

Comprehensive monitoring setup for CulturaFlow application including frontend, backend, and infrastructure metrics.

## Monitoring Stack

### Core Services
- **Sentry**: Error tracking, performance monitoring, and alerting
- **Grafana**: Dashboards and visualization
- **Prometheus**: Metrics collection and storage
- **Loki**: Log aggregation and querying
- **Jaeger**: Distributed tracing (optional)

### Infrastructure Monitoring
- **Docker Stats**: Container resource usage
- **PostgreSQL Exporter**: Database metrics
- **Redis Exporter**: Cache metrics
- **Node Exporter**: System metrics

## Key Metrics to Monitor

### Frontend (Mobile App)
```yaml
Performance Metrics:
  - App startup time
  - Screen load times
  - API response times
  - Memory usage
  - Battery impact
  - Crash rate
  - ANR rate (Android)

User Experience:
  - User sessions
  - Screen views
  - Feature usage
  - Conversion rates
  - Retention rates
  - User feedback scores

Error Metrics:
  - JavaScript errors
  - Network failures
  - Crash reports
  - Error rates by version
```

### Backend API
```yaml
Performance Metrics:
  - Request latency (p50, p95, p99)
  - Throughput (requests/second)
  - Database query times
  - Redis response times
  - Memory usage
  - CPU utilization
  - Disk I/O

Reliability:
  - Error rates by endpoint
  - HTTP status codes
  - Database connection pool
  - Queue processing times
  - Uptime/downtime
  - Health check status

Business Metrics:
  - User registrations
  - Content views
  - Quiz completions
  - Premium subscriptions
  - Daily/Monthly active users
```

### Infrastructure
```yaml
System Metrics:
  - CPU usage per container
  - Memory usage per container
  - Disk usage and I/O
  - Network bandwidth
  - Container restart counts
  - Service discovery health

Database Metrics:
  - Connection pool usage
  - Query execution times
  - Slow query counts
  - Lock wait times
  - Replication lag
  - Storage usage

Cache Metrics:
  - Hit/miss ratios
  - Memory usage
  - Eviction rates
  - Connection counts
  - Response times
```

## Alert Configuration

### Critical Alerts (Immediate Response)
```yaml
Frontend:
  - Crash rate > 1%
  - App startup time > 5 seconds
  - Network error rate > 5%

Backend:
  - Error rate > 1%
  - Response time p95 > 2 seconds
  - Database connection failures
  - Service downtime > 1 minute

Infrastructure:
  - Container memory usage > 90%
  - Container CPU usage > 90%
  - Disk space > 85%
  - Database connections > 80% of pool
```

### Warning Alerts (Monitor Closely)
```yaml
Frontend:
  - Crash rate > 0.5%
  - App startup time > 3 seconds
  - Memory warnings

Backend:
  - Error rate > 0.5%
  - Response time p95 > 1 second
  - Slow queries > 1 second
  - Queue backlog > 100 items

Infrastructure:
  - Container memory usage > 70%
  - Container CPU usage > 70%
  - Disk space > 70%
  - High network latency
```

## Dashboard Layout

### Executive Dashboard
```
Row 1: Key Business Metrics
- Daily Active Users
- Monthly Active Users
- Revenue (Premium subscriptions)
- User Retention Rate

Row 2: System Health Overview
- Overall Error Rate
- Average Response Time
- System Uptime
- Active Alerts

Row 3: Performance Summary
- App Performance Score
- API Performance Score
- Database Performance
- Infrastructure Health
```

### Technical Operations Dashboard
```
Row 1: Frontend Metrics
- Mobile App Crash Rate
- App Performance Metrics
- User Session Analytics
- Feature Usage Heatmap

Row 2: Backend Performance
- API Response Times
- Error Rates by Endpoint
- Database Query Performance
- Queue Processing Status

Row 3: Infrastructure Status
- Container Resource Usage
- Database Metrics
- Cache Performance
- Network Status
```

### Development Dashboard
```
Row 1: Code Quality
- Test Coverage
- Build Success Rate
- Deployment Frequency
- Lead Time for Changes

Row 2: Error Tracking
- New Errors Today
- Error Trends
- Top Error Categories
- Resolution Time

Row 3: Performance Trends
- Performance Score Trends
- User Experience Metrics
- Resource Usage Trends
- Capacity Planning Metrics
```

## Grafana Dashboard JSON Export

### Mobile App Performance Dashboard
```json
{
  "dashboard": {
    "title": "CulturaFlow Mobile App Performance",
    "tags": ["mobile", "performance", "culturaflow"],
    "panels": [
      {
        "title": "App Startup Time",
        "type": "stat",
        "targets": [
          {
            "expr": "avg(mobile_app_startup_time_seconds)",
            "legendFormat": "Startup Time"
          }
        ]
      },
      {
        "title": "Crash Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "rate(mobile_app_crashes_total[5m]) * 100",
            "legendFormat": "Crash Rate %"
          }
        ]
      },
      {
        "title": "User Sessions",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(mobile_app_sessions_total[1h])",
            "legendFormat": "Sessions per Hour"
          }
        ]
      }
    ]
  }
}
```

## Monitoring Setup Scripts

### Docker Compose for Monitoring Stack
```yaml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
      - ./dashboards:/etc/grafana/provisioning/dashboards

  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
    volumes:
      - loki_data:/loki

volumes:
  prometheus_data:
  grafana_data:
  loki_data:
```

### Prometheus Configuration
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'culturaflow-backend'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    scrape_interval: 5s

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
```

## Alert Rules

### Prometheus Alert Rules
```yaml
groups:
  - name: culturaflow.rules
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.01
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
```

## Log Management

### Log Levels and Structure
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "service": "culturaflow-backend",
  "requestId": "req_123456789",
  "userId": "user_abc123",
  "message": "User completed quiz",
  "metadata": {
    "quizId": "quiz_789",
    "score": 85,
    "duration": 120
  }
}
```

### Log Retention Policy
```
Development: 7 days
Staging: 30 days
Production: 90 days (critical logs 1 year)
```

## Incident Response

### Severity Levels
- **P0 (Critical)**: Complete service outage
- **P1 (High)**: Major feature degradation
- **P2 (Medium)**: Minor feature issues
- **P3 (Low)**: Performance degradation

### Escalation Matrix
```
P0: Immediate notification to on-call engineer
P1: Notification within 15 minutes
P2: Notification within 1 hour
P3: Daily summary report
```

## Cost Optimization

### Monitoring Budget
- Sentry: ~$100/month for production volume
- Cloud monitoring: ~$50/month
- Log storage: ~$30/month
- Total estimated: ~$200/month

### Cost Reduction Strategies
- Sample non-critical metrics in production
- Compress and archive old logs
- Use efficient alert rules
- Regular cleanup of unused dashboards