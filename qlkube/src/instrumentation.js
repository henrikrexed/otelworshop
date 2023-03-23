const opentelemetry = require("@opentelemetry/sdk-node")
const { getNodeAutoInstrumentations } = require("@opentelemetry/auto-instrumentations-node")
const { OTLPTraceExporter } =  require('@opentelemetry/exporter-trace-otlp-grpc')
const { HttpInstrumentation } = require ('@opentelemetry/instrumentation-http');
const { ExpressInstrumentation } = require ('@opentelemetry/instrumentation-express');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-grpc')
const { PeriodicExportingMetricReader,MeterProvider,AggregationTemporality } = require('@opentelemetry/sdk-metrics');
const { containerDetector } = require('@opentelemetry/resource-detector-container')
const { gcpDetector } = require('@opentelemetry/resource-detector-gcp')
const { envDetector, hostDetector, osDetector, processDetector,Resource } = require('@opentelemetry/resources')
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const otel = require('@opentelemetry/api')
const { GraphQLInstrumentation } = require('@opentelemetry/instrumentation-graphql');

const sdk = new opentelemetry.NodeSDK({
  traceExporter: new OTLPTraceExporter(),
  instrumentations: [ getNodeAutoInstrumentations(),
                    new HttpInstrumentation(),
                    new ExpressInstrumentation(),
                     new GraphQLInstrumentation({
                           mergeItems: true,
                           ignoreTrivialResolveSpans: true,
                        }),],
  metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter()
    }),
     resourceDetectors: [
        containerDetector,
        envDetector,
        hostDetector,
        osDetector,
        processDetector
      ],
})

sdk.start()

const resource =
  Resource.default().merge(
    new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: "qlkube",
      [SemanticResourceAttributes.SERVICE_VERSION]: "0.1.0",
    })
  );
const metricReader = new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({temporalityPreference: AggregationTemporality.DELTA}),
    // Default is 60000ms (60 seconds). Set to 3 seconds for demonstrative purposes only.
    exportIntervalMillis: 3000,
});
const myServiceMeterProvider = new MeterProvider({
  resource: resource,
});

myServiceMeterProvider.addMetricReader(metricReader);
otel.metrics.setGlobalMeterProvider(myServiceMeterProvider)

