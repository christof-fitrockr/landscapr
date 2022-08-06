# Fitrockr Management


## Trace Service

The trace service is collecting traces from various sources and shows them in the management interface. To add a trace, just send
a post request to

https://manage.fitrockr.com/api/trace/add

The post content will be a trace 

Typescript definition:
```typescript
export class Trace {
  userId: string;
  source: string;
  traceId: string;
  timestamp: Date;
  event: string;
  message: string;
  additionalInformation: any;
}
```

JSON:
```json
{
  "userId": "<user-id>",
  "source": "<user-id>",
  "traceId": "<user-id>",
  "timestamp": 123456789,
  "event": "<user-id>",
  "message": "<user-id>",
  "additionalInformation": {
    "key1": "value1",
    "key2": "value2",
  }
}
```