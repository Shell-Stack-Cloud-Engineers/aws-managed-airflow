import * as path from "path";
import * as fs from "fs";
import {S3} from "aws-sdk";

/**
 * Recursively read a folder and return all files in the folder
 * @param files
 * @param rootDirectory
 */
const readFolderRecursive = (files:Array<string>,rootDirectory:string):Array<string>=>{

  fs.readdirSync(rootDirectory).forEach((file: string)=>{
    const absolute = path.join(rootDirectory,file);
    if(fs.statSync(absolute).isDirectory()){
      return readFolderRecursive(files, absolute)
    }
    return files.push(absolute)
  })

  return files
}

export const uploadFolderToS3 = async (folderPath: string, bucketName: string, s3Client: S3, prefix?:string) => {
    const files = readFolderRecursive([], folderPath);
    for (const file of files) {
        const relativePath = path.relative(folderPath, file);
        let key = relativePath.replace(/\\/g, "/");
        key = prefix ? `${prefix}/${key}` : key;
        const body = fs.readFileSync(file);
        const {ETag} = await s3Client.putObject({
            Bucket: bucketName,
            Key: key,
            Body: body
        }).promise();
        console.log(`Uploaded ${file} to s3://${bucketName}/${key} with ETag ${ETag}`)
    }
}
