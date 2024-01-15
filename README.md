# Project Name

## Description

This project is a GitHub App built with [Probot](https://github.com/probot/probot) that sets default environments for all repositories in an organization.

For every new repo created, the App will create environments associated with its name pattern, simulating org-level environments.

### Relevant notes on the App behavior

- All the users and teams listed as reviewers will gain `write` access to the repo
- Secrets won't be created in the environment, instead, org-level secrets will gain access to the repo ([#2](https://github.com/pedrolacerda/org-level-environments/issues/2))
- The App works for repos created after the App is installed. It doesn't work backwards to apply the role for existing repos ([#4](https://github.com/pedrolacerda/org-level-environments/issues/4))
- Users and teams are not case-sensitive. If they don't exist in the org, they won't be created, the entry is skipped instead.

## Setup

### Configuration

Create a `.github-private` repo within your organization. This repo should have a `org-environments.yml` file in the root. Check the [`org-environments.yml.example`](https://github.com/pedrolacerda/org-level-environments/blob/main/org-environments.yml.example) to check the pattern to be used.

```sh
# Install dependencies
npm install

# Run the bot
npm start
```


## Contributing

If you have suggestions for how this project could be improved, or want to report a bug, open an issue! We'd love all and any contributions. For more, check out the Contributing Guide.

License
ISC © 2024 Pedro Lacerda
