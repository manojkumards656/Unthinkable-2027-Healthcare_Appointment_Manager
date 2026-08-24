import { getCalendarClient } from './client';

export async function createAppointmentEvent(
  refreshToken: string,
  appointment: {
    doctorName: string;
    patientName: string;
    startTime: Date;
    endTime: Date;
  }
): Promise<string | null> {
  try {
    const calendar = getCalendarClient(refreshToken);
    const event = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: `Medical Consultation - Dr. ${appointment.doctorName}`,
        description: `Healthcare Platform appointment between Dr. ${appointment.doctorName} and ${appointment.patientName}`,
        start: { dateTime: appointment.startTime.toISOString() },
        end: { dateTime: appointment.endTime.toISOString() },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 60 },
            { method: 'popup', minutes: 30 },
          ],
        },
      },
    });
    return event.data.id || null;
  } catch (error) {
    console.error('Failed to create Google Calendar event:', error);
    return null;
  }
}

export async function deleteAppointmentEvent(
  refreshToken: string,
  eventId: string
): Promise<void> {
  try {
    const calendar = getCalendarClient(refreshToken);
    await calendar.events.delete({ calendarId: 'primary', eventId });
  } catch (error) {
    console.error('Failed to delete Google Calendar event:', error);
  }
}
