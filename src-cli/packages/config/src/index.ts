import convict from 'convict';

export interface AppConfig {
    port: number;
}

const configSchema = convict<AppConfig>({
    port: {
        doc: 'The port to bind (if the CLI ever exposes a local server).',
        format: 'port',
        default: 3000,
        env: 'PORT',
        arg: 'port',
    },
});

configSchema.validate({ allowed: 'strict' });

export const config = configSchema.getProperties();
