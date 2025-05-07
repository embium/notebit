import { publicProcedure, router } from '@src/trpc';
import { z } from 'zod';
import { filePathConversionProcedure } from '../services/fileAttachmentService';

export const fileAttachmentsRouter = router({
  // Read file content as base64 or text
  getFileContent: filePathConversionProcedure,
});
