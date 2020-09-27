/**
 * Holds the settings for the kafka brokers from which spiking neural network events are streamed
 */
export interface KafkaSettings {
    brokers: Array<KafkaBroker>;
}

/**
 * Holds information for a single kafka broker
 */
export interface KafkaBroker {
    host: string;
    port: number;
}
