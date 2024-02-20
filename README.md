# Manages Workflows for Apache Airflow
Perform the following steps to deploy this project.

1. Install dependencies: `npm ci`
2. Update [config](/infra/config/config.ts) with you account details
3. Deploy stack: `npm run deploy`
4. Wait for resources to deploy
5. Got MWAA in the AWS Management Console and open the Airflow UI
6. Sync DAGs from local to Airflow: `npm run sync`
7. Execute DAGS from Airflow

**Note**: This project does not make assumptions or provisions for the resources the DAGs will need, e.g. EC2 instances, EMR clusters, etc. Edit the Airflow Execution Role and Security Group as necessary to ensure Airflow has sufficient permissions to access additional resources.