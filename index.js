const yaml = require("js-yaml");

/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Probot} app
 */
module.exports = (app) => {
  console.info("Yay, the app was loaded!");
  app.on("repository.created", async (context) => {
    console.info(`Setting environments for repo ${context.payload.repository.full_name}`);

    const repo = context.payload.repository;
    const owner = repo.owner.login;
    const name = repo.name;


    // Read "org-environments" file and create an environment for each line
    const orgEnvironments = JSON.parse(await getConfigFileContent(context));
    
    // For each environment, check if the repo name matches any of the wildcards in the "repo" section
    try {
      for (const environment of orgEnvironments.environments) {
        // If repo created name's matches any of the wildcards in the "repo" section, create the environment
        if (environment.repositories) {
          for (const repoWildcard of environment.repositories) {
            const repoRegex = new RegExp(repoWildcard.replace(/\*/g, ".*"));
            
            if (repoRegex.test(name)) {
              console.info(`Creating environment ${environment.name} for repo ${context.payload.repository.full_name}`);
              
              await setTeamsAndUsersReviewers(context, environment.reviewers).then(async reviewers => {
                await setReviewersObject(context, reviewers).then(async reviewersObject => {
                  await context.octokit.repos.createOrUpdateEnvironment({
                    owner: owner,
                    repo: name,
                    environment_name: environment.name,
                    reviewers: reviewersObject
                  }).then(async () => {
                    console.info(`Environment ${environment.name} created. Creating variables and secrets: ${JSON.stringify(environment.variables)}`);
                    await addVariablesToEnvironment(context, environment.name, environment.variables);
                    await addRepoAccessToSecrets(context, environment.secrets);
                  });
                });
              });
            } else {
              console.info(`Repo ${name} does not match wildcard ${repoWildcard}`);
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error creating environment for repo ${name}`);
      console.error(error);
    }
  });
};

async function getConfigFileContent(context) {
  let configFile = null;
  try {
    configFile = await context.octokit.repos.getContent({
      owner: context.payload.repository.owner.login,
      repo: ".github-private",
      path: "org-environments.yml",
    });
  } catch (error) {
    console.error("Error getting config file content");
    console.error(error);
  }

  const buff = Buffer.from(configFile.data.content, configFile.data.encoding) // encoding should be 'base64'
  const settings = yaml.load(buff.toString())

  return JSON.stringify(settings);
}

async function setReviewersObject(context, reviewers) {
  let reviewersObject = [];
  const owner = context.payload.repository.owner.login;
  
  try {
    for (const user of reviewers.usernames) {
      // Get the user id from the username
      let userId = await context.octokit.users.getByUsername({
        username: user
      });

      reviewersObject.push({ type: 'User', id: userId.data.id })
    }

    for (const team of reviewers.teams) {
      // Get the team id from the team name
      let teamId = await context.octokit.teams.getByName({
        org: owner,
        team_slug: team
      });

      reviewersObject.push({ type: 'Team', id: teamId.data.id });
    }
  } catch (error) {
    console.error('Error occurred while get reviewers ids. Either the user/team does not exist or the user is already a collaborator');
    console.error(error);
  }

  return reviewersObject;
}

async function setTeamsAndUsersReviewers(context, reviewers) {
  const owner = context.payload.repository.owner.login;
  const name = context.payload.repository.name;

  try {
    for (const userReviewer of reviewers.usernames) {
      console.info(`Adding user ${userReviewer} as reviewer for repo ${name}`);
      await context.octokit.repos.addCollaborator({
        owner: owner,
        repo: name,
        username: userReviewer,
        permission: 'pull'
      });
    } 
    
    for (const teamReviewer of reviewers.teams) {
      console.info(`Adding team ${teamReviewer} as reviewer for repo ${name}`);
      await context.octokit.teams.addOrUpdateRepoPermissionsInOrg({
        org: owner,
        team_slug: teamReviewer,
        owner: owner,
        repo: name,
        permission: 'pull'
      });
    }
  } catch (error) {
    console.error(`Error adding reviewers to repo: ${name}, either the user/team does not exist or the user is already a collaborator`);
    console.error(error);
  }

  return reviewers;
}

async function addVariablesToEnvironment(context, environment, variables) {
  const repoId = context.payload.repository.id;

  try {
    for (const variable of variables) {
      console.info(`Adding variable ${variable.name} to environment ${environment} for repo ${context.payload.repository.full_name}`);

      await context.octokit.request('POST /repositories/{repository_id}/environments/{environment_name}/variables', {
        repository_id: repoId,
        environment_name: environment,
        name: variable.name,
        value: variable.value,
      });
    }    
  } catch (error) {
    console.error(`Variable ${variable.name} could not be added to environment ${environment} for repo ${context.payload.repository.full_name}`)
    console.error(`Error adding variables to environment: ${error}`);
  }
}

async function addRepoAccessToSecrets(context, secrets) {
  const owner = context.payload.repository.owner.login;
  const repoId = context.payload.repository.id;

  for (const secret of secrets) {
    try{
      await context.octokit.actions.setSelectedReposForOrgSecret({
        org: owner,
        secret_name: secret,
        selected_repository_ids: [repoId]
      })
    } catch (error) {
      console.error(`Secret ${secret} does not exist in the org`);
      console.error(error);
    }
  }
}