const fs = require("fs").promises;
const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const compression = require('compression');
const {createSchema} = require('./schema');
const getOpenApiSpec = require('./oas');
const { printSchema } = require('graphql');
const logger = require('pino')({useLevelLabels: true});
const tracer = require('./instrumentation')
const otel = require('@opentelemetry/api')

main().catch(e => logger.error({error: e.stack}, "failed to start qlkube server"));

async function main() {

    const inCluster = process.env.IN_CLUSTER !== 'false';
    logger.info({inCluster}, "cluster mode configured");
    const kubeApiUrl = inCluster ? 'https://kubernetes.default.svc' : 'http://localhost:8001';
    const token = inCluster ? await fs.readFile('/var/run/secrets/kubernetes.io/serviceaccount/token', 'utf8') : '';
    const meter = otel.metrics.getMeter('ApolloServer');
    const apollo_request=meter.createCounter('apollo.request.total',{
                      description: 'Total number of queries received',
                      unit: 'requests',
                     });
    const apollo_fied_error=meter.createCounter('apollo.field.error',{
                          description: 'Total number of field errors',
                          unit: 'errors',
                         });
    const apollo_request_duration=meter.createObservableGauge('apollo.resolvefileds.duration',{
                          description: 'duration in ns',
                          unit: 'ns',
                         });
    const apollo_operation_duration=meter.createObservableGauge('apollo.operation.duration',{
                              description: 'duration in ms',
                              unit: 'ms',
                             });
    const apollo_operation_size=meter.createObservableGauge('apollo.operation.size',{
                                  description: 'operation size in bytes',
                                  unit: 'bytes',
                                 });
    const myPlugin = {
      // Fires whenever a GraphQL request is received from a client.
      async requestDidStart(requestContext) {
        const labels = { query: requestContext.request.query};

        apollo_request.add(1,labels);
        return {
          // Fires whenever Apollo Server will parse a GraphQL
          // request to create its associated document AST.
          async parsingDidStart(requestContext) {
            console.log('Parsing started!');
          },

          // Fires whenever Apollo Server will validate a
          // request's document AST against your GraphQL schema.
          async validationDidStart(requestContext) {
            console.log('Validation started!');
          },
          async executionDidStart(executionRequestContext) {
              return {

               async didResolveOperation (context) {
                        op = context.operationName
                      },
                      willSendResponse (context) {
                        const stop = Date.now()
                        const elapsed = stop - start
                        const size = JSON.stringify(context.response).length * 2
                        const label_operation = { query: requestContext.request.query,
                                       operation: op,
                                    };
                        apollo_operation_duration.addCallback(
                                              (result) => {
                                                result.observe(elapsed,label_operation)
                                              }
                                            )
                        apollo_operation_size.addCallback(
                                              (result) => {
                                                result.observe(size,label_operation)
                                              }
                                            )

               },

                async willResolveField({ source, args, contextValue, info }) {
                  const start = process.hrtime.bigint();
                  const label = { query: requestContext.request.query,
                                  fieldName: info.fieldName
                                };


                  return (error, result) => {
                    const end = process.hrtime.bigint();
                    let latency= end - start;
                    apollo_operation_duration.addCallback(
                      (result) => {
                        result.observe(latency,label)
                      }
                    )
                    console.log(`Field ${info.parentType.name}.${info.fieldName} took ${end - start}ns`);
                    if (error) {
                      const label_error = { query: requestContext.request.query,
                                          fieldName: info.fieldName,
                                          errormessage: error
                                            };
                      apollo_request.add(1,label_error);
                      console.log(`It failed with ${error}`);
                    }
                  };
                },
              };
          },
        };
      },
    };

    const oas = await getOpenApiSpec(kubeApiUrl, token);
    const schema = await createSchema(oas, kubeApiUrl, token);

    const server = new ApolloServer({
        schema,
        plugins: [myPlugin],});

    const app = express();
    app.use(compression());
    app.get('/schema', (req, res) => {
        res.setHeader('content-type', 'text/plain');
        res.send(printSchema(schema))
    });
    app.get('/health', (req, res) => {
        res.setHeader('content-type', 'application/json');
        res.json({ healthy: true })
    });
    server.applyMiddleware({
        app,
        path: '/'
    });
    app.listen({ port: 8080 }, () =>
        logger.info({url: `http://localhost:8080${server.graphqlPath}`}, '🚀 Server ready')
    );
}




