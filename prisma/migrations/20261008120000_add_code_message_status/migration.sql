ALTER TABLE "Order"
ADD COLUMN "codeMessageStatus" TEXT,
ADD COLUMN "codeMessageId" TEXT,
ADD COLUMN "codeMessageError" TEXT,
ADD COLUMN "codeMessageAt" TIMESTAMP(3);
