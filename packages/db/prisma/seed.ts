// Gelistirme ortami icin idempotent seed verisi.
// RLS'i bypass etmesi gerektigi icin MIGRATE_DATABASE_URL (sema sahibi rol) ile calisir.
import { PrismaClient, UserRole, AttendanceStatus } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.MIGRATE_DATABASE_URL } },
});

async function main() {
  const institution = await prisma.institution.upsert({
    where: { code: 'MERKEZ' },
    update: {},
    create: { name: 'Merkez Yurt (Demo)', code: 'MERKEZ' },
  });

  const passwordHash = await hash('Deneme123!', 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'sistem.yoneticisi@example.org' },
    update: {},
    create: {
      role: UserRole.SUPER_ADMIN,
      fullName: 'Sistem Yöneticisi',
      email: 'sistem.yoneticisi@example.org',
      passwordHash,
      institutionId: null,
    },
  });

  const institutionAdmin = await prisma.user.upsert({
    where: { email: 'kurum.yoneticisi@example.org' },
    update: {},
    create: {
      role: UserRole.INSTITUTION_ADMIN,
      fullName: 'Kurum Yöneticisi',
      email: 'kurum.yoneticisi@example.org',
      passwordHash,
      institutionId: institution.id,
    },
  });

  const teacher = await prisma.user.upsert({
    where: { email: 'ogretmen@example.org' },
    update: {},
    create: {
      role: UserRole.TEACHER,
      fullName: 'Ahmet Yılmaz',
      email: 'ogretmen@example.org',
      passwordHash,
      institutionId: institution.id,
    },
  });

  const term = await prisma.academicTerm.upsert({
    where: { id: 'seed-term-2026-2027' },
    update: {},
    create: {
      id: 'seed-term-2026-2027',
      institutionId: institution.id,
      name: '2026-2027',
      startDate: new Date('2026-10-01'),
      endDate: new Date('2027-06-30'),
    },
  });

  const group = await prisma.group.upsert({
    where: { id: 'seed-group-a' },
    update: {},
    create: {
      id: 'seed-group-a',
      institutionId: institution.id,
      termId: term.id,
      name: 'A Grubu',
    },
  });

  const course = await prisma.course.upsert({
    where: { id: 'seed-course-matematik' },
    update: {},
    create: { id: 'seed-course-matematik', institutionId: institution.id, name: 'Matematik' },
  });

  const schedule = await prisma.lessonSchedule.upsert({
    where: { id: 'seed-schedule-1' },
    update: {},
    create: {
      id: 'seed-schedule-1',
      institutionId: institution.id,
      groupId: group.id,
      courseId: course.id,
      teacherId: teacher.id,
      dayOfWeek: 1, // Sali
      startTime: '18:00',
      endTime: '19:30',
      weeklyFrequency: 1,
      classroom: 'A-101',
    },
  });

  const students = await Promise.all(
    [
      ['Ayşe', 'Demir', '2026001'],
      ['Berkay', 'Koç', '2026002'],
      ['Cemre', 'Aydın', '2026003'],
    ].map(([firstName, lastName, studentNumber]) =>
      prisma.student.upsert({
        where: { id: `seed-student-${studentNumber}` },
        update: {},
        create: {
          id: `seed-student-${studentNumber}`,
          institutionId: institution.id,
          studentNumber: studentNumber!,
          firstName: firstName!,
          lastName: lastName!,
          enrollDate: new Date('2026-10-01'),
        },
      }),
    ),
  );

  await Promise.all(
    students.map((s) =>
      prisma.groupMembership.upsert({
        where: { id: `seed-membership-${s.studentNumber}` },
        update: {},
        create: {
          id: `seed-membership-${s.studentNumber}`,
          studentId: s.id,
          groupId: group.id,
          effectiveFrom: new Date('2026-10-01'),
        },
      }),
    ),
  );

  const occurrence = await prisma.sessionOccurrence.upsert({
    where: { id: 'seed-occurrence-1' },
    update: {},
    create: { id: 'seed-occurrence-1', scheduleId: schedule.id, date: new Date('2026-10-06') },
  });

  await Promise.all(
    students.map((s, i) =>
      prisma.attendanceRecord.upsert({
        where: {
          sessionOccurrenceId_studentId: { sessionOccurrenceId: occurrence.id, studentId: s.id },
        },
        update: {},
        create: {
          sessionOccurrenceId: occurrence.id,
          studentId: s.id,
          status: i === 0 ? AttendanceStatus.ABSENT_UNEXCUSED : AttendanceStatus.PRESENT,
          markedById: teacher.id,
        },
      }),
    ),
  );

  console.log('Seed tamamlandi:', {
    institution: institution.code,
    users: [superAdmin.email, institutionAdmin.email, teacher.email],
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
