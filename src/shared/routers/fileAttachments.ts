import { router } from '@shared/trpc';
import { filePathConversionProcedure } from '../services/fileAttachmentService';

export const fileAttachmentsRouter = router({
  // Read file content as base64 or text
  getFileContent: filePathConversionProcedure,
});
