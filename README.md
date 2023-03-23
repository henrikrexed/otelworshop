# OpenTelemetry Workshop

This environment is using :
- a modified version of the project Qlkube
- the openTelemetry demo 
- the OpenTelemetry Operator 
- Dynatrace
- The Hipstershop



## Deployment Steps in GCP

You will first need a Kubernetes cluster with 2 Nodes.
You can either deploy on Minikube or K3s or follow the instructions to create GKE cluster:
### 1.Create a Google Cloud Platform Project
```shell
PROJECT_ID="<your-project-id>"
gcloud services enable container.googleapis.com --project ${PROJECT_ID}
gcloud services enable monitoring.googleapis.com \
    cloudtrace.googleapis.com \
    clouddebugger.googleapis.com \
    cloudprofiler.googleapis.com \
    --project ${PROJECT_ID}
```
### 2.Create a GKE cluster
```shell
ZONE=europe-west3-a
NAME=otelworkshop
gcloud container clusters create "${NAME}" \
 --zone ${ZONE} --machine-type=e2-standard-2 --num-nodes=3
```


## Getting started
### Dynatrace Tenant
#### 1. Dynatrace Tenant - start a trial
If you don't have any Dyntrace tenant , then i suggest to create a trial using the following link : [Dynatrace Trial](https://bit.ly/3KxWDvY)
Once you have your Tenant save the Dynatrace (including https) tenant URL in the variable `DT_TENANT_URL` (for example : https://dedededfrf.live.dynatrace.com)
```
DT_TENANT_URL=<YOUR TENANT URL>
```


#### 2. Create the Dynatrace API Tokens
Create a Dynatrace token with the following scope ( left menu Acces Token):
* ingest metrics
* ingest OpenTelemetry traces
<p align="center"><img src="/image/data_ingest.png" width="40%" alt="data token" /></p>
Save the value of the token . We will use it later to store in a k8S secret

```
DATA_INGEST_TOKEN=<YOUR TOKEN VALUE>
```
### 3.Clone the Github Repository
```shell
git clone https://github.com/henrikrexed/otelworshop
cd otelworshop
```
### 4.Deploy most of the components
The application will deploy the otel demo v1.3.1
```shell
chmod 777 deployment.sh
./deployment.sh  --clustername "${NAME}" --environment-url "${DT_TENANT_URL}" --api-token "${DATA_INGEST_TOKEN}"
```

### 5. Instrumentation

The instrumentation example will use the code build in : 
- qlkube/src/instrumentation.js
- qlkube/src/index.js

for more information about qlkube, check the [documentation](qlkube/qlkube.md)

### 6. THe openTelemetry Collector

#### Trace pipeline

Go to the instruction located in the [following page](Instructions/01_collector_pipeline_traces/index.md)

####  pipeline
Go to the instruction located in the [following page](Instructions/02_collector_pipeline_metrics/index.md)

### 7. The openTelemetry Operator

Go to the instruction located in the [following page](Instructions/03_Auto_Instrumentation/index.md)


