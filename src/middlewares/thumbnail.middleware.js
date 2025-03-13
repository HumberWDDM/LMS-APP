import multer from 'multer';

import { thumbnailFileName, uploadDir } from '../utils/index.js';

const thumbnailUploadDir = uploadDir()



const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, thumbnailUploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, thumbnailFileName(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};


const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

export default upload;