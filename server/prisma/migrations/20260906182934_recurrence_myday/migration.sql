-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "listId" TEXT,
    "title" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "dueDate" DATETIME,
    "reminderAt" DATETIME,
    "priority" INTEGER NOT NULL DEFAULT 4,
    "tagsJson" TEXT NOT NULL DEFAULT '[]',
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "recurrence" TEXT NOT NULL DEFAULT 'none',
    "recurrenceJson" TEXT NOT NULL DEFAULT '{}',
    "lastCompletedAt" DATETIME,
    "myDay" BOOLEAN NOT NULL DEFAULT false,
    "myDayDate" DATETIME,
    "subtasksJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Task_listId_fkey" FOREIGN KEY ("listId") REFERENCES "List" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("createdAt", "deletedAt", "dueDate", "id", "isDone", "listId", "note", "priority", "recurrence", "reminderAt", "subtasksJson", "tagsJson", "title", "updatedAt", "userId") SELECT "createdAt", "deletedAt", "dueDate", "id", "isDone", "listId", "note", "priority", "recurrence", "reminderAt", "subtasksJson", "tagsJson", "title", "updatedAt", "userId" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
CREATE INDEX "Task_userId_idx" ON "Task"("userId");
CREATE INDEX "Task_userId_updatedAt_idx" ON "Task"("userId", "updatedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
