from airflow.decorators import dag, task
from airflow import settings
import os
import boto3
from airflow.utils.dates import days_ago
from airflow.models import DagRun, TaskFail, TaskInstance
import csv, re
from io import StringIO
from dotenv import load_dotenv

from modules.airflow_config import AirflowConfigData

load_dotenv()
DAG_ID = os.path.basename(__file__).replace(".py", "")

airflow_config = AirflowConfigData(application_identifier=os.getenv("APPCONFIG_APPLICATION_IDENTIFIER"),
                                   configuration_profile_identifier=os.getenv("APPCONFIG_CONFIGURATION_PROFILE_IDENTIFIER"),
                                   environment_identifier=os.getenv("APPCONFIG_ENVIRONMENT_IDENTIFIER"))

MAX_AGE_IN_DAYS = 30 
S3_BUCKET = airflow_config.airflow_bucket
S3_KEY = 'files/export/{0}.csv' 

# You can add other objects to export from the metadatabase,
OBJECTS_TO_EXPORT = [
    [DagRun,DagRun.execution_date],
    [TaskInstance, TaskInstance.execution_date],
]
 
@task()
def export_db_task(**kwargs):
    session = settings.Session()
    print("session: ",str(session))
 
    oldest_date = days_ago(MAX_AGE_IN_DAYS)
    print("oldest_date: ",oldest_date)

    s3 = boto3.client('s3')

    for x in OBJECTS_TO_EXPORT:
        query = session.query(x[0]).filter(x[1] >= days_ago(MAX_AGE_IN_DAYS))
        print("type",type(query))
        allrows=query.all()
        name=re.sub("[<>']", "", str(x[0]))
        print(name,": ",str(allrows))

        if len(allrows) > 0:
            outfileStr=""
            f = StringIO(outfileStr)
            w = csv.DictWriter(f, vars(allrows[0]).keys())
            w.writeheader()
            for y in allrows:
                w.writerow(vars(y))
            outkey = S3_KEY.format(name[6:])
            s3.put_object(Bucket=S3_BUCKET, Key=outkey, Body=f.getvalue())
 
@dag(
    dag_id=DAG_ID,
    schedule_interval=None,
    start_date=days_ago(1),
    )
def export_db():
    t = export_db_task()

metadb_to_s3_test = export_db()
