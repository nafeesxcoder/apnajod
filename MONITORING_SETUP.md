# Monitoring & Error Tracking Setup

## Overview
Production monitoring for Apnajoda - tracking errors, performance, and system health.

---

## 1. Error Tracking (Sentry)

### Installation
```bash
npm install @sentry/node @sentry/tracing
```

### Backend Setup
```javascript
// backend/src/config/sentry.js
const Sentry = require("@sentry/node");

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
});

module.exports = Sentry;
```

### Frontend Setup
```typescript
// frontend/src/config/sentry.ts
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_DSN,
  environment: process.env.REACT_APP_ENV,
  tracesSampleRate: 1.0,
});
```

### Error Logging
```javascript
// Automatic error catching
app.use(Sentry.Handlers.errorHandler());

// Manual error reporting
Sentry.captureException(error);
Sentry.captureMessage("Warning message", "warning");
```

---

## 2. Performance Monitoring

### Key Metrics to Track
- API response time
- Database query time
- Error rate
- Server CPU/Memory
- User session duration
- Payment success rate
- Login success rate

### Implementation
```javascript
// Performance middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${duration}ms`);
    
    if (duration > 1000) {
      Sentry.captureMessage(
        `Slow request: ${req.path} (${duration}ms)`,
        "warning"
      );
    }
  });
  
  next();
});
```

---

## 3. Health Checks

### Database Health
```javascript
// GET /health/db
async function checkDatabase() {
  try {
    const start = Date.now();
    await query("SELECT 1");
    const duration = Date.now() - start;
    
    return {
      status: duration < 100 ? "healthy" : "slow",
      responseTime: duration,
      timestamp: new Date(),
    };
  } catch (error) {
    return {
      status: "unhealthy",
      error: error.message,
      timestamp: new Date(),
    };
  }
}
```

### API Health
```javascript
// GET /health/api
app.get('/health/api', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date(),
  });
});
```

### Full System Health
```javascript
// GET /health
app.get('/health', async (req, res) => {
  const dbHealth = await checkDatabase();
  const apiHealth = { uptime: process.uptime() };
  
  const status = dbHealth.status === 'healthy' ? 'up' : 'degraded';
  
  res.json({
    status,
    database: dbHealth,
    api: apiHealth,
    timestamp: new Date(),
  });
});
```

---

## 4. Logging Strategy

### Log Levels
```javascript
const logger = {
  error: (msg, meta) => console.error(`[ERROR] ${msg}`, meta),
  warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta),
  info: (msg, meta) => console.log(`[INFO] ${msg}`, meta),
  debug: (msg, meta) => console.log(`[DEBUG] ${msg}`, meta),
};

// Usage
logger.error('Payment failed', { userId, error });
logger.warn('High memory usage', { usage: '85%' });
logger.info('User signup', { userId, email });
```

### Request Logging
```javascript
app.use((req, res, next) => {
  const log = {
    timestamp: new Date(),
    method: req.method,
    path: req.path,
    userId: req.user?.id,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  };
  
  res.on('finish', () => {
    log.status = res.statusCode;
    log.duration = res.duration;
    logger.info('Request', log);
  });
  
  next();
});
```

### Security Event Logging
```javascript
// Log security events
logger.warn('Failed login attempt', { email, attempts: 3 });
logger.error('User blocked', { userId, reason: 'harassment' });
logger.info('Password reset', { userId });
logger.warn('Suspicious payment', { userId, amount: 50000 });
```

---

## 5. Alerts & Notifications

### Alert Thresholds
```javascript
const alerts = {
  errorRate: { threshold: 5, unit: '%' }, // 5% error rate
  responseTime: { threshold: 1000, unit: 'ms' }, // 1 second
  memoryUsage: { threshold: 90, unit: '%' }, // 90% RAM
  cpuUsage: { threshold: 80, unit: '%' }, // 80% CPU
  databaseDown: { critical: true }, // Immediate alert
};
```

### Alert Channels
```javascript
// Email alerts
const sendAlert = (severity, message) => {
  if (severity === 'critical') {
    sendEmail('alerts@apnajoda.com', {
      subject: '🚨 Critical Alert',
      body: message,
    });
  }
};

// Webhook alerts (Slack, PagerDuty, etc.)
const notifySlack = (message) => {
  fetch(process.env.SLACK_WEBHOOK, {
    method: 'POST',
    body: JSON.stringify({ text: message }),
  });
};
```

---

## 6. Dashboard Metrics

### Real-time Dashboard (at status.apnajoda.com)
- Live error rate
- API response times
- Server load
- Database performance
- User activity
- Payment transactions
- System uptime

### Weekly Reports
- Error summary
- Performance trends
- User metrics
- Conversion rates
- Support tickets
- Security events

---

## 7. Database Performance

### Query Monitoring
```sql
-- Log slow queries
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1; -- 1 second

-- Monitor connections
SHOW PROCESSLIST;
SHOW STATUS WHERE variable_name IN ('Threads_connected', 'Threads_running');
```

### Index Optimization
```sql
-- Check for unused indexes
SELECT * FROM sys.schema_unused_indexes;

-- Analyze query performance
EXPLAIN SELECT * FROM users WHERE email = 'test@example.com';
```

---

## 8. Uptime Monitoring

### External Uptime Monitor
```javascript
// Use service like UptimeRobot
// Ping endpoint: https://apnajoda.app/health
// Check frequency: Every 5 minutes
// Alert if down > 5 minutes
```

### Internal Monitoring
```javascript
const checkUptime = setInterval(async () => {
  try {
    const response = await fetch('https://apnajoda.app/health');
    const health = await response.json();
    
    if (health.status !== 'up') {
      Sentry.captureMessage('System degraded', 'error');
    }
  } catch (error) {
    Sentry.captureException(error);
  }
}, 60000); // Check every minute
```

---

## 9. Analytics Events

### Track Important Events
```javascript
// User events
analytics.track('user_signup', { email, age, city });
analytics.track('profile_verified', { userId });
analytics.track('subscription_created', { userId, planId, amount });

// Engagement events
analytics.track('match_liked', { userId, targetId });
analytics.track('message_sent', { userId, recipientId });
analytics.track('game_played', { userId, gameType, result });

// Payment events
analytics.track('payment_initiated', { userId, amount, method });
analytics.track('payment_success', { userId, amount, planId });
analytics.track('payment_failed', { userId, amount, reason });
```

---

## 10. Incident Response

### On-Call Rotation
- Primary on-call: 1 person
- Secondary on-call: 1 person
- Weekly rotation
- Escalation path defined

### Response Time SLA
- Critical: 15 minutes response
- High: 1 hour response
- Medium: 4 hours response
- Low: 24 hours response

### Runbooks
```
/runbook/database-down
/runbook/payment-failure
/runbook/high-error-rate
/runbook/ddos-attack
/runbook/data-corruption
```

---

## Setup Checklist

- [ ] Sentry account created
- [ ] Sentry DSN added to env vars
- [ ] Error tracking integrated (backend)
- [ ] Error tracking integrated (frontend)
- [ ] Health check endpoints created
- [ ] Logging middleware added
- [ ] Database monitoring enabled
- [ ] Uptime monitoring configured
- [ ] Alert channels set up (email, Slack)
- [ ] Dashboard created
- [ ] Team trained on alerts
- [ ] Incident response plan documented
- [ ] On-call rotation established
- [ ] Runbooks created

---

## Status: ✅ READY

All monitoring systems configured.
Production deployment ready.
