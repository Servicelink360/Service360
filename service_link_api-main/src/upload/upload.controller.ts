import {
  Controller,
  Post,
  Req,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  Version,
} from '@nestjs/common';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { promises as fs } from 'fs';
import { join } from 'path';
import { errorCode } from '../constants/errorCode';
import { ApiMultiFile } from '../decorators/files.decorator';
import { FastifyFileInterceptor } from '../interceptors/fastify-file-interceptor';
import { FastifyFilesInterceptor } from '../interceptors/fastify-files-interceptor';
import { fileMapper, filesMapper } from '../helpers/file-mappter';
import { editFileName, fileFilter, imageFileFilter } from '../helpers/util';
import { memoryStorage } from 'fastify-multer';
import { shouldStoreUploadsOnS3, uploadBufferToS3 } from './s3-upload.helper';

const LOCAL_UPLOAD_DIR = './public/upload/files';

@Controller({
  version: ['1'],
})
@ApiTags('Upload File')
export class UploadController {
  @ApiConsumes('multipart/form-data')
  @Post('uploadFile')
  @UseInterceptors(
    FastifyFileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: imageFileFilter,
    }),
  )
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async single(@Req() req: any, @UploadedFile() file: any) {
    if (!file?.buffer?.length) {
      return { ...errorCode.EXCEPTION, message: 'No file uploaded' };
    }
    try {
      if (shouldStoreUploadsOnS3()) {
        const url = await uploadBufferToS3(file.buffer, file.originalname, file.mimetype);
        return { ...errorCode.SUCCESS, data: url };
      }
      await fs.mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
      const diskName = await new Promise<string>((resolve, reject) => {
        editFileName(req, file, (err, name) => (err ? reject(err) : resolve(String(name))));
      });
      const fullPath = join(LOCAL_UPLOAD_DIR, diskName).replace(/\\/g, '/');
      await fs.writeFile(fullPath, file.buffer);
      const mapped = fileMapper({
        file: { ...file, path: fullPath },
        req,
      });
      return { ...errorCode.SUCCESS, data: mapped };
    } catch (e) {
      console.log('uploadFile', e);
      return { ...errorCode.EXCEPTION, message: (e as Error)?.message || 'Upload failed' };
    }
  }

  @ApiConsumes('multipart/form-data')
  @Post('uploadFiles')
  @ApiMultiFile()
  @UseInterceptors(
    FastifyFilesInterceptor('files', 10, {
      storage: memoryStorage(),
      fileFilter: imageFileFilter,
    }),
  )
  async multiple(@Req() req: any, @UploadedFiles() files: any[]) {
    if (!files?.length) {
      return { ...errorCode.EXCEPTION, message: 'No files uploaded' };
    }
    try {
      if (shouldStoreUploadsOnS3()) {
        const urls = await Promise.all(
          files.map((f) => uploadBufferToS3(f.buffer, f.originalname, f.mimetype)),
        );
        return { ...errorCode.SUCCESS, data: urls };
      }
      await fs.mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
      const mappedFiles: any[] = [];
      for (const f of files) {
        const diskName = await new Promise<string>((resolve, reject) => {
          editFileName(req, f, (err, name) => (err ? reject(err) : resolve(String(name))));
        });
        const fullPath = join(LOCAL_UPLOAD_DIR, diskName).replace(/\\/g, '/');
        await fs.writeFile(fullPath, f.buffer);
        mappedFiles.push({ ...f, path: fullPath });
      }
      return { ...errorCode.SUCCESS, data: filesMapper({ files: mappedFiles, req }) };
    } catch (e) {
      console.log('uploadFiles', e);
      return { ...errorCode.EXCEPTION, message: (e as Error)?.message || 'Upload failed' };
    }
  }

  @ApiConsumes('multipart/form-data')
  @Post('import-excel')
  @UseInterceptors(
    FastifyFileInterceptor('file', {
      storage: diskStorage({
        destination: LOCAL_UPLOAD_DIR,
        filename: editFileName,
      }),
      fileFilter: fileFilter,
    }),
  )
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  importExcel(@Req() req: any, @UploadedFile() file: any) {
    return { ...errorCode.SUCCESS, data: fileMapper({ file, req }) };
  }

  @Post('uploadFile')
  @Version('2')
  @UseInterceptors(
    FastifyFileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: imageFileFilter,
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Use AWS S3 (explicit v2; optional file_path prefix)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        file_path: {
          type: 'string',
        },
      },
    },
  })
  async uploadFileV2(@Req() request: any, @UploadedFile() file: any) {
    try {
      if (!file?.buffer?.length) {
        return { ...errorCode.EXCEPTION, message: 'No file uploaded' };
      }
      const prefix = request?.body?.file_path ? `${String(request.body.file_path).replace(/\/+$/, '')}/` : '';
      const dateFolder = `${new Date().getFullYear()}-${new Date().getMonth() + 1}-${new Date().getDate()}`;
      const objectKey = `${prefix}${dateFolder}/${file.originalname}`;
      const url = await uploadBufferToS3(file.buffer, file.originalname, file.mimetype, objectKey);
      return { ...errorCode.SUCCESS, data: url };
    } catch (error) {
      console.log(error);
      return { ...errorCode.EXCEPTION, message: (error as Error)?.message || 'S3 upload failed' };
    }
  }
}
