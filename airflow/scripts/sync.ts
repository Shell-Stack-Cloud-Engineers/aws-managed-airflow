import {S3} from 'aws-sdk'
import {AirflowAppConfig} from "./airflow-app-config";
import {uploadFolderToS3} from "./s3-upload";
import {config} from "dotenv";
import * as path from "path";

config({path: path.join(__dirname, '.env')})

const main = async (dagsFolder: string):Promise<void> => {
    const appConfig = {
        applicationIdentifier: process.env.APPCONFIG_APPLICATION_IDENTIFIER!,
        configurationProfileIdentifier: process.env.APPCONFIG_CONFIGURATION_PROFILE_IDENTIFIER!,
        environmentIdentifier: process.env.APPCONFIG_ENVIRONMENT_IDENTIFIER!
    }


    const {airflowS3BucketName} = await (new AirflowAppConfig(appConfig)).loadConfig()

    const s3Client = new S3()

    await uploadFolderToS3(dagsFolder,airflowS3BucketName,s3Client)

}

(()=>{
    const {profile, dagsFolder} = require('minimist')(process.argv.slice(2));
    if(profile){
        process.env.AWS_SDK_LOAD_CONFIG = "1"
        process.env.AWS_PROFILE = profile
    }
    if(!dagsFolder){
        throw "Please specify the dags folder to sync."
    }
    main(dagsFolder).then(()=>{
        console.log("Sync complete")
    }).catch((e)=>{console.error(e)})
})()