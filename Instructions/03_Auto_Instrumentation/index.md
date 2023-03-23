## Auto Instrumentation 

In this module to inject the auto instrumentation library using the OpenTelemetry Operator.

In this module you will go through the following actions:

1. Create a new Namespace for our demo application
1. Deploy the OpenTelemetry SideCar collector in the namespace
1. Deploy the `Instrumentation` object in the namespace
1. Update the `Instrumetnation` object by adding the right instrumentation annotation

### Step 1: Create the New Namespace

1. Go to the folder of the exercice :

   Go to o the folder : `exercise/03_auto-instrumentation`
   
   ```bash
   cd exercise/03_auto-instrumentation`
   ```


3. Deploy the OpenTelemetry Sidecar Collector
   
   ```bash
   kubectl apply -f openTelemetry-sidecar.yaml -n hipster-shop
   ```
   
4. Look at the Instrumentation object
   ```bash
   cat instrumentation.yaml
   ```
   
5. Deploy the instrumentation object
   ```bash
   kubectl apply -f  instrumentation.yaml -n hipster-shop
   ```

### Step 2 : Configure the Deployment file


1. Add the right instrumentation annotation in the deployment file
 
    To be able to inject the right OpenTelemetry Agent in the workload, we need to add the right annotation for:
      - Java : `instrumentation.opentelemetry.io/inject-java: "true"`
      - Nodejs: `instrumentation.opentelemetry.io/inject-nodejs: "true"`
      - Python: `instrumentation.opentelemetry.io/inject-python: "true"`
      - Dotnet: `instrumentation.opentelemetry.io/inject-dotnet: "true"`

    Edit `k8Sdemo-nootel.yaml` add the right annotation based on the annotation `technology`

2. Deploy the application

   ```bash
   kubectl apply -f  k8Sdemo-nootel.yaml -n hipster-shop
   ```

### Step 3 : Look at the generated traces

1. Open your Dynatrace tenant :

   > 1. Navigate to `Distributed traces` via Dynatrace Menu
   > 2. Click on ingested Traces
   > 3. Click on the produced by the service Frontend-service




