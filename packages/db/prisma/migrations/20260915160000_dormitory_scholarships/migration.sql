-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "scholarshipProgramId" TEXT;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "department" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "scholarshipProgramId" TEXT,
ADD COLUMN     "university" TEXT,
ADD COLUMN     "universityYear" INTEGER;

-- AlterTable
ALTER TABLE "LessonSchedule" ADD COLUMN     "assignmentId" TEXT;

-- CreateTable
CREATE TABLE "ScholarshipProgram" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScholarshipProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherAssignment" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "scholarshipProgramId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScholarshipProgram_code_key" ON "ScholarshipProgram"("code");

-- CreateIndex
CREATE INDEX "TeacherAssignment_institutionId_scholarshipProgramId_idx" ON "TeacherAssignment"("institutionId", "scholarshipProgramId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherAssignment_teacherId_institutionId_scholarshipProgra_key" ON "TeacherAssignment"("teacherId", "institutionId", "scholarshipProgramId");

-- CreateIndex
CREATE INDEX "Student_institutionId_scholarshipProgramId_idx" ON "Student"("institutionId", "scholarshipProgramId");

-- CreateIndex
CREATE INDEX "LessonSchedule_assignmentId_idx" ON "LessonSchedule"("assignmentId");

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_scholarshipProgramId_fkey" FOREIGN KEY ("scholarshipProgramId") REFERENCES "ScholarshipProgram"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_scholarshipProgramId_fkey" FOREIGN KEY ("scholarshipProgramId") REFERENCES "ScholarshipProgram"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_scholarshipProgramId_fkey" FOREIGN KEY ("scholarshipProgramId") REFERENCES "ScholarshipProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonSchedule" ADD CONSTRAINT "LessonSchedule_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "TeacherAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
