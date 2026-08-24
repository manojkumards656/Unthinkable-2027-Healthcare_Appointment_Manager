import { Inngest } from 'inngest';

export const inngest = new Inngest({ 
  id: 'healthcare-platform',
  eventKey: process.env.INNGEST_EVENT_KEY,
});
