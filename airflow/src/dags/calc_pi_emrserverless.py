import os
from datetime import datetime
from airflow import DAG
from airflow.providers.amazon.aws.operators.emr import (
    EmrServerlessCreateApplicationOperator,
    EmrServerlessStartJobOperator,
    EmrServerlessDeleteApplicationOperator,
)
from modules.airflow_config import AirflowConfigData
from dotenv import load_dotenv

load_dotenv()

airflow_config = AirflowConfigData(application_identifier=os.getenv("APPCONFIG_APPLICATION_IDENTIFIER"),
                                   configuration_profile_identifier=os.getenv("APPCONFIG_CONFIGURATION_PROFILE_IDENTIFIER"),
                                   environment_identifier=os.getenv("APPCONFIG_ENVIRONMENT_IDENTIFIER"))

# Replace these with your correct values
JOB_ROLE_ARN = airflow_config.ec2_emr_instance_profile_name

DAG_ID = os.path.basename(__file__).replace(".py", "")

DEFAULT_MONITORING_CONFIG = {
    "monitoringConfiguration": {
        "s3MonitoringConfiguration": {
            "logUri": f"s3://{airflow_config.airflow_bucket}/logs/"}
    },
}

with DAG(
        dag_id=DAG_ID,
        schedule_interval=None,
        start_date=datetime(2021, 1, 1),
        tags=["emr_serverless"],
        catchup=False,
) as dag:
    create_app = EmrServerlessCreateApplicationOperator(
        task_id="create_spark_app",
        job_type="SPARK",
        release_label="emr-6.7.0",
        config={"name": "airflow-test"},
    )

    application_id = create_app.output

    job1 = EmrServerlessStartJobOperator(
        task_id="start_job_1",
        application_id=application_id,
        execution_role_arn=JOB_ROLE_ARN,
        job_driver={
            "sparkSubmit": {
                "entryPoint": "local:///usr/lib/spark/examples/src/main/python/pi_fail.py",
            }
        },
        configuration_overrides=DEFAULT_MONITORING_CONFIG,
    )

    job2 = EmrServerlessStartJobOperator(
        task_id="start_job_2",
        application_id=application_id,
        execution_role_arn=JOB_ROLE_ARN,
        job_driver={
            "sparkSubmit": {
                "entryPoint": "local:///usr/lib/spark/examples/src/main/python/pi.py",
                "entryPointArguments": ["1000"]
            }
        },
        configuration_overrides=DEFAULT_MONITORING_CONFIG,
    )

    delete_app = EmrServerlessDeleteApplicationOperator(
        task_id="delete_app",
        application_id=application_id,
        trigger_rule="all_done",
    )

    (create_app >> [job1, job2] >> delete_app)
