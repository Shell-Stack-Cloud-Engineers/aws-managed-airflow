import boto3
import json


class AirflowConfigData:
    airflow_bucket: str
    emr_service_role_name: str
    ec2_emr_instance_profile_name: str

    def __init__(self, application_identifier: str, environment_identifier: str, configuration_profile_identifier,
                 app_config_client=boto3.client('appconfigdata')):
        app_config_session = app_config_client.start_configuration_session(
            ApplicationIdentifier=application_identifier,
            EnvironmentIdentifier=environment_identifier,
            ConfigurationProfileIdentifier=configuration_profile_identifier
        )

        config_token = app_config_session.get('InitialConfigurationToken')

        if config_token is None:
            raise "No valid config token for app config"

        response = app_config_client.get_latest_configuration(
            ConfigurationToken=config_token
        )

        config_data = json.loads(response['Configuration'].read())

        self.airflow_bucket = config_data.get('airflowS3BucketName')
        self.emr_service_role_name = config_data.get('emrServiceRoleName')
        self.ec2_emr_instance_profile_name = config_data.get('ec2EmrInstanceProfileName')
