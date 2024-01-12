# org-level-environments

> A GitHub App built with [Probot](https://github.com/probot/probot) that GitHub App that sets default enviromnts for all repos in an org

## Setup

```sh
# Install dependencies
npm install

# Run the bot
npm start
```

## Docker

```sh
# 1. Build container
docker build -t org-level-environments .

# 2. Start container
docker run -e APP_ID=<app-id> -e PRIVATE_KEY=<pem-value> org-level-environments
```

## Contributing

If you have suggestions for how org-level-environments could be improved, or want to report a bug, open an issue! We'd love all and any contributions.

For more, check out the [Contributing Guide](CONTRIBUTING.md).

## License

[ISC](LICENSE) © 2024 Pedro Lacerda
