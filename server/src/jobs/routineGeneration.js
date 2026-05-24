import cron from 'node-cron';
import { prisma } from '../db.js';

// Run every night at midnight
// "0 0 * * *"
const startRoutineGenerationJob = () => {
  cron.schedule('0 0 * * *', async () => {
    console.log('Running daily routine generation job...');
    try {
      await generateRidesForTomorrow();
      console.log('Successfully generated daily routines.');
    } catch (error) {
      console.error('Error generating daily routines:', error);
    }
  });
  console.log('Routine generation cron job initialized.');
};

const generateRidesForTomorrow = async () => {
  // 1. Determine tomorrow's day of week (0 = Sunday, 1 = Monday, etc.)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDayOfWeek = tomorrow.getDay();
  
  // Create the exact Date for tomorrow
  // We'll set the time later based on each schedule's departureTime
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // 2. Fetch all active schedules that run on tomorrow's day
  const activeSchedules = await prisma.rideSchedule.findMany({
    where: {
      isActive: true,
      daysOfWeek: {
        has: tomorrowDayOfWeek
      }
    },
    include: {
      subscribers: {
        where: {
          status: 'ACCEPTED'
        }
      }
    }
  });

  // 3. For each schedule, generate a RidePost and associated RideRequests
  for (const schedule of activeSchedules) {
    // Parse departureTime (e.g. "08:30")
    const [hours, minutes] = schedule.departureTime.split(':').map(Number);
    const departureTime = new Date(`${tomorrowStr}T00:00:00.000Z`);
    departureTime.setUTCHours(hours, minutes, 0, 0); // Assuming stored time is UTC or handle timezone as needed

    const subscribersCount = schedule.subscribers.length;
    const seatsAvailable = Math.max(0, schedule.seatsTotal - subscribersCount);

    // Create the RidePost
    const newRidePost = await prisma.ridePost.create({
      data: {
        ownerId: schedule.ownerId,
        routeId: schedule.routeId,
        departureTime: departureTime,
        fareTotal: schedule.fareTotal,
        seatsTotal: schedule.seatsTotal,
        seatsAvailable: seatsAvailable,
        status: seatsAvailable === 0 ? 'FULL' : 'OPEN'
      }
    });

    // Create RideRequests for all ACCEPTED subscribers
    if (subscribersCount > 0) {
      const requestsData = schedule.subscribers.map(sub => ({
        ridePostId: newRidePost.id,
        passengerId: sub.passengerId,
        status: 'ACCEPTED'
      }));

      await prisma.rideRequest.createMany({
        data: requestsData
      });
    }
  }
};

export { startRoutineGenerationJob };
