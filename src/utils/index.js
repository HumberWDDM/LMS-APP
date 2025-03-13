import path from "path"
import fs from "fs"
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const handleError = (req,res, error,errorMessage,redirectTemplate, context = {}) => {
    console.error(errorMessage, error);
    req.session.error =  errorMessage;
    res.redirect(redirectTemplate);
};

export const thumbnailFileName = (fileName)=>{
    const thumbnailName =  Date.now() + '-' + Math.round(Math.random() * 1E9)
    const thumbnailExt = path.extname(fileName);
    return `course-${thumbnailName}${thumbnailExt}`
};

export const uploadDir = () => {
    const dir = path.join(__dirname, '../../public/uploads/course-thumbnails');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
};

export const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
};