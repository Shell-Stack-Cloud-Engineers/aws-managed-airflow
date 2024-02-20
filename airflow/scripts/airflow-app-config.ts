import {AppConfigData} from 'aws-sdk'

interface AirflowAppConfigProps{
    applicationIdentifier: string,
    configurationProfileIdentifier: string,
    environmentIdentifier: string
}

interface AirflowConfig{
    airflowS3BucketName:string,
    emrServiceRoleName:string,
    ec2EmrInstanceProfileName:string
}

export class AirflowAppConfig{
    private appConfigDataClient:AppConfigData
    private applicationIdentifier: string
    private configurationProfileIdentifier: string
    private environmentIdentifier: string
    constructor({applicationIdentifier, configurationProfileIdentifier, environmentIdentifier}:AirflowAppConfigProps) {
        this.applicationIdentifier = applicationIdentifier;
        this.configurationProfileIdentifier = configurationProfileIdentifier;
        this.environmentIdentifier = environmentIdentifier;
        this.appConfigDataClient = new AppConfigData({region:'eu-west-1'})
    }

    public async loadConfig():Promise<AirflowConfig> {
        const {InitialConfigurationToken} = await this.appConfigDataClient.startConfigurationSession({
            ApplicationIdentifier: this.applicationIdentifier,
            ConfigurationProfileIdentifier: this.configurationProfileIdentifier,
            EnvironmentIdentifier: this.environmentIdentifier
        }).promise()

        if (InitialConfigurationToken == undefined){
            throw "App config session failed. No config token retrieved."
        }

        const {Configuration} = await this.appConfigDataClient.getLatestConfiguration({
            ConfigurationToken: InitialConfigurationToken
        }).promise()

        if (Configuration == undefined){
            throw "Configuration retrieval failed. Configuration not defined."
        }

        return JSON.parse(Configuration.toString())

    }

}
