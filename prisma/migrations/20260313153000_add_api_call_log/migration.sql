CREATE TABLE "ApiCallLog" (
  "id" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "statusCode" INTEGER NOT NULL,
  "requestBody" JSONB,
  "responseBody" JSONB,
  "errorMessage" TEXT,
  "employeeId" TEXT,
  "ip" TEXT,
  "userAgent" TEXT,
  "durationMs" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApiCallLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ApiCallLog_path_createdAt_idx" ON "ApiCallLog"("path", "createdAt");
CREATE INDEX "ApiCallLog_method_createdAt_idx" ON "ApiCallLog"("method", "createdAt");
CREATE INDEX "ApiCallLog_statusCode_createdAt_idx" ON "ApiCallLog"("statusCode", "createdAt");
CREATE INDEX "ApiCallLog_employeeId_createdAt_idx" ON "ApiCallLog"("employeeId", "createdAt");

ALTER TABLE "ApiCallLog"
ADD CONSTRAINT "ApiCallLog_employeeId_fkey"
FOREIGN KEY ("employeeId") REFERENCES "Employee"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
