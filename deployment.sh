#!/usr/bin/env bash

################################################################################
### Script deploying environment for the OTEL training
###
################################################################################
###########################################################################################################
####  Required Environment variable :
#### ENVIRONMENT_URL=<with your environment URL (with'https'). Example: https://{your-environment-id}.live.dynatrace.com> or {your-domain}/e/{your-environment-id}
#### API_TOKEN : api token with the following right : metric ingest, trace ingest, and log ingest and Access problem and event feed, metrics and topology
#########################################################################################################
### Pre-flight checks for dependencies
if ! command -v jq >/dev/null 2>&1; then
    echo "Please install jq before continuing"
    exit 1
fi

if ! command -v git >/dev/null 2>&1; then
    echo "Please install git before continuing"
    exit 1
fi


if ! command -v helm >/dev/null 2>&1; then
    echo "Please install helm before continuing"
    exit 1
fi

if ! command -v kubectl >/dev/null 2>&1; then
    echo "Please install kubectl before continuing"
    exit 1
fi

while [ $# -gt 0 ]; do
  case "$1" in
  --environment-url)
    ENVIRONMENT_URL="$2"
   shift 2
    ;;
  --api-token)
    API_TOKEN="$2"
   shift 2
    ;;
   --clustername)
    CLUSTERNAME="$2"
   shift 2
    ;;
  *)
    echo "Warning: skipping unsupported option: $1"
    shift
    ;;
  esac
done

if [ -z "$ENVIRONMENT_URL" ]; then
  echo "Error: environment-url not set!"
  exit 1
fi

if [ -z "$API_TOKEN" ]; then
  echo "Error: api-token not set!"
  exit 1
fi


VERSION=1.3.1

###### DEploy Nginx
echo "start depploying Nginx"
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm upgrade --install ingress-nginx ingress-nginx \
  --repo https://kubernetes.github.io/ingress-nginx \
  --namespace ingress-nginx --create-namespace
### get the ip adress of ingress ####
IP=""
while [ -z $IP ]; do
  echo "Waiting for external IP"
  IP=$(kubectl get svc ingress-nginx-controller -n ingress-nginx -ojson | jq -j '.status.loadBalancer.ingress[].ip')
  [ -z "$IP" ] && sleep 10
done
echo 'Found external IP: '$IP

sed -i "s,IP_TO_REPLACE,$IP," qlkube/deployments/ingress.yaml

#### Deploy the cert-manager
echo "Deploying Cert Manager ( for OpenTelemetry Operator)"
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.11.0/cert-manager.yaml
# Wait for pod webhook started
kubectl wait pod -l app.kubernetes.io/instance=cert-manager -n cert-manager --for=condition=Ready --timeout=2m
kubectl rollout status deployment cert-manager-webhook -n cert-manager

#Modify local files
sed -i "s,DT_TENANT_URL,$ENVIRONMENT_URL," kubernetes-manifests/openTelemetry-manifest.yaml
sed -i "s,DT_TOKEN,$API_TOKEN," kubernetes-manifests/openTelemetry-manifest.yaml
sed -i "s,DT_TENANT_URL,$ENVIRONMENT_URL," exercise/02_collector/metrics/openTelemetry-manifest.yaml
sed -i "s,DT_TOKEN,$API_TOKEN," exercise/02_collector/metrics/openTelemetry-manifest.yaml
sed -i "s,DT_TENANT_URL,$ENVIRONMENT_URL,"  exercise/02_collector/trace/openTelemetry-manifest.yaml
sed -i "s,DT_TOKEN,$API_TOKEN," exercise/02_collector/trace/openTelemetry-manifest.yaml
CLUSTERID=$(kubectl get namespace kube-system -o jsonpath='{.metadata.uid}')
sed -i "s,CLUSTER_ID_TOREPLACE,$CLUSTERID," kubernetes-manifests/openTelemetry-sidecar.yaml
sed -i "s,CLUSTER_ID_TOREPLACE,$CLUSTERID," exercise/03_auto-instrumentation/openTelemetry-sidecar.yaml
sed -i "s,CLUSTER_NAME_TO_REPLACE,$CLUSTER_NAME," kubernetes-manifests/openTelemetry-sidecar.yaml
sed -i "s,CLUSTER_NAME_TO_REPLACE,$CLUSTER_NAME," exercise/03_auto-instrumentation/openTelemetry-sidecar.yaml
sed -i "s,CLUSTER_NAME_TO_REPLACE,$CLUSTER_NAME," qlkube/deployments/openTelemetry-sidecar.yaml
sed -i "s,CLUSTER_ID_TOREPLACE,$CLUSTERID," qlkube/deployments/openTelemetry-sidecar.yaml
#wait for the opentelemtry operator webhook to start

# Deploy the opentelemetry operator
echo "Deploying the OpenTelemetry Operator"
echo "Wait for the certmanager"
sleep 40
kubectl apply -f https://github.com/open-telemetry/opentelemetry-operator/releases/latest/download/opentelemetry-operator.yaml


kubectl create ns otel-demo
sed -i "s,VERSION_TO_REPLACE,$VERSION," kubernetes-manifests/K8sdemo.yaml
kubectl apply -f kubernetes-manifests/openTelemetry-sidecar.yaml -n otel-demo
kubectl apply -f kubernetes-manifests/K8sdemo.yaml -n otel-demo
echo "Deploying Otel Collector"
kubectl apply -f kubernetes-manifests/rbac.yaml
kubectl apply -f kubernetes-manifests/openTelemetry-manifest.yaml
#manage the hipster-shop namespace
echo "Deploying application"
kubectl create ns hipster-shop

#Deploy qlkube
kubectl create ns qlkube
kubectl apply -f kubernetes-manifests/openTelemetry-sidecar.yaml -n qlkube
kubectl apply -f qlkube/deployments/deployment.yaml -n qlkube
kubectl apply -f  qlkube/deployments/ingress.yaml -n qlkube

# Echo environ
echo "========================================================"
echo "Environment fully deployed "
echo "========================================================"


